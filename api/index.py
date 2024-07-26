import replicate, spotipy, instructor
import base64, os, requests, urllib

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from spotipy.oauth2 import SpotifyOAuth
from openai import OpenAI
from pydantic import BaseModel
from typing import List
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
key: str = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
supabase: Client = create_client(url, key)

class Track(BaseModel):
    track: str
    artist: str
    track_id: str
    artist_id: str

Tracks = List[Track]
sample_tracks: Tracks = []

# open ai client
client = instructor.from_openai(OpenAI())

# spotify auth manager
auth_manager = SpotifyOAuth(
    client_id=os.getenv("CLIENT_ID"),
    client_secret=os.getenv("CLIENT_SECRET"),
    redirect_uri="https://playscene-app.vercel.app/callback",
    #redirect_uri="http://127.0.0.1:8000/callback", # local
    scope="streaming playlist-modify-public user-top-read user-library-modify user-read-email user-read-private",
    show_dialog=True)

sp = spotipy.Spotify(auth_manager=auth_manager)
access_token = ''

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")

allowed_origins = [
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
def root():
    return {"message": "Hello World"}

@app.get("/login")
def login():
    return RedirectResponse(auth_manager.get_authorize_url())

@app.get("/callback")
def callback(req: Request):
    global access_token
    client_id = os.getenv("CLIENT_ID")
    client_secret = os.getenv("CLIENT_SECRET")
    cred = f"{client_id}:{client_secret}"
    cred_b64 = base64.b64encode(cred.encode()).decode()

    form = {
        "code": req.query_params.get('code'),
        "redirect_uri":"https://playscene-app.vercel.app/callback",
        #"redirect_uri": "http://127.0.0.1:8000/callback", # local
        "grant_type": "authorization_code" 
    }
    headers = {
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization': f'Basic {cred_b64}'
    }

    response = requests.post("https://accounts.spotify.com/api/token", data=form, headers=headers)
    response_json = response.json()

    if "access_token" in response_json:
        access_token = response_json["access_token"]
        redirect_url = "http://localhost:3000/?access_token=" + access_token
        print(f'callback access token: {access_token}')
        return RedirectResponse(redirect_url)

# test replicate - local use only
@app.get("/replicate")
def get_image():
    path = 'https://fiabfmfxtsqxyresiqcw.supabase.co/storage/v1/object/public/playscene/uploads/arts-club-night-dinner.jpeg'
    input = {
        "image": path,
        "clip_model_name": "ViT-L-14/openai"
    }

@app.post("/upload")
async def upload(request: Request):
    req = await request.json()
    print(f'req: {req}')
    imagePath = req["path"]
    res = supabase.storage.from_('playscene').get_public_url(f'uploads/{imagePath}')
    print(f'res: {res}')

    # call Replicate
    input = {
        "image": res,
        "clip_model_name": "ViT-L-14/openai"
    } 
    print('Running the replicate model...')
    output = replicate.run("pharmapsychotic/clip-interrogator:8151e1c9f47e696fa316146a2e35812ccf79cfc9eba05b11c7f450155102af70", input )

    # call Open AI for sample tracks
    print('Running the gpt model...')
    sample_tracks = get_sample_tracks(output)

    # call Spotify API for recs
    print('Running the spotify recs...')
    return (generate_playlist(sample_tracks))

def get_sample_tracks(img_desc):
    # get 5 sample tracks from open ai
    response = client.chat.completions.create_iterable(
        model="gpt-3.5-turbo",
        response_model=Track,
        messages=[
            {"role": "system", "content": "You are a helpful assistant and music junkie."},
            {"role": "assistant", "content": img_desc},
            {"role": "user", "content": "Based on the description of an image provided, recommend only 5 different songs that fit the vibe. Only return the artist and track for each recommendation."}
    ])
    
    for resp in response:
        sample_tracks.append(resp)

    return sample_tracks

def generate_playlist(sample_tracks):
    # get spotify ids of each track using search endpoint
    for track in sample_tracks:
        query_str = urllib.parse.quote(f'track:{track.track} artist:{track.artist}', safe='')
        response = sp.search(f'q:{query_str}', type='track')
        if not response['tracks']['items']:
            continue
        else:
            track.track_id = response['tracks']['items'][0]['id']
        
    # call spotify api recommendations endpoint - takes up to 5 seeds
    track_ids = [track.track_id for track in sample_tracks][:5]
    rec_response = sp.recommendations(seed_tracks=track_ids)
    rec_tracks =  [track['id'] for track in rec_response['tracks']]

    # get user id
    user_response = sp.me()
    user_id = user_response['id']

    # create playlist
    create_playlist = sp.user_playlist_create(user_id, f'{user_id}\'s playlist')
    playlist_id = create_playlist['id']

    # add to playlist
    add_tracks = sp.playlist_add_items(playlist_id, rec_tracks)

    # get playlist image
    cover_image = sp.playlist_cover_image(playlist_id)[1]['url']

    return {'playlist': playlist_id, 'cover_image': cover_image, 'user': user_id}