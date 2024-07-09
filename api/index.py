import replicate, spotipy, instructor
import base64, os, requests, urllib
import pprint, json

from fastapi import FastAPI, Request, File, UploadFile, Form
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from urllib.request import urlopen 
from dotenv import load_dotenv
from spotipy.oauth2 import SpotifyOAuth
from pprint import pprint
from openai import OpenAI
from pydantic import BaseModel
from typing import List

load_dotenv()

# class Track:
#     def __init__(self, title, artist):
#         self.title = title,
#         self.artist = artist,
#         self.track_id = '',
#         self.artist_id = ''

class Track(BaseModel):
    track: str
    artist: str
    track_id: str
    artist_id: str

Tracks = List[Track]
sample_tracks: Tracks = []

access_token = ''

# open ai client
client = instructor.from_openai(OpenAI())

# spotify client
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=os.getenv("CLIENT_ID"),
    client_secret=os.getenv("CLIENT_SECRET"),
    redirect_uri="http://localhost:8888/callback",
    scope="streaming playlist-modify-private playlist-modify-public user-top-read user-library-modify user-read-email user-read-private"))

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
def root():
    return {"message": "Hello World"}

@app.get("/login")
def login():
    auth_options = {
        "client_id": os.getenv("CLIENT_ID"),
        "response_type": "code",
        "redirect_uri": "http://127.0.0.1:8000/callback", #TODO CHANGE THIS
        "scope": "streaming playlist-modify-private playlist-modify-public user-top-read user-library-modify user-read-email user-read-private",
        "show_dialog": "true"
    }
    auth_url = "https://accounts.spotify.com/authorize?" + urllib.parse.urlencode(auth_options)
    return RedirectResponse(auth_url)

@app.get("/callback")
def callback(req: Request):
    global access_token
    client_id = os.getenv("CLIENT_ID")
    client_secret = os.getenv("CLIENT_SECRET")
    cred = f"{client_id}:{client_secret}"
    cred_b64 = base64.b64encode(cred.encode()).decode()

    form = {
        "code": req.query_params.get('code'),
        "redirect_uri": "http://127.0.0.1:8000/callback",
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
        return RedirectResponse(redirect_url)

# test replicate locally
@app.get("/replicate")
def get_image(input: dict):
    #img = open("././public/turtle.jpg", "rb")

    input = {
        "image": input["image"],
        "clip_model_name": "ViT-L-14/openai"
    }

    #output = replicate.run("pharmapsychotic/clip-interrogator:8151e1c9f47e696fa316146a2e35812ccf79cfc9eba05b11c7f450155102af70", input )
    #print(output)
    #return(output)

@app.post("/upload")
def upload(imagePath: str = Form(...), accessToken: str = Form(...)):
    #print("imagePath: ", imagePath)
    # convert to File obj
    img = open(imagePath, "rb")
    input = { "image": img }
    
    # call Replicate
    output = get_image(input)
    # print(output)

    # call Open AI for sample tracks
    #output = "a watercolor painting of a sea turtle, a digital painting, by Kubisi art, featured on dribbble, medibang, warm saturated palette, red and green tones, turquoise horizon, digital art h 9 6 0, detailed scenery —width 672, illustration:.4, spray art, artstatiom"
    #sample_tracks = get_sample_tracks(output)

    # call Spotify API for recs
    #return (generate_playlist(sample_tracks))

def get_sample_tracks(img_desc):
    # get 5 sample tracks from open ai
    response = client.chat.completions.create_iterable(
        model="gpt-3.5-turbo",
        response_model=Track,
        messages=[
            {"role": "system", "content": "You are a helpful assistant and music junkie."},
            {"role": "assistant", "content": img_desc},
            {"role": "user", "content": "Based on the description of an image provided, recommend 5 different tracks that fit the vibe. Only return the artist and track for each recommendation."}
    ])
    
    for resp in response:
        sample_tracks.append(resp)
        #print(resp)

    return sample_tracks



def generate_playlist(sample_tracks):
    # get spotify access token
    #print('generate_playlist')
    #print('accessToken', access_token)

    # # test with multiple tracks
    # sample_tracks = []
    # sample_tracks.append(Track("Ocean Eyes", "Billie Eilish")) 
    # sample_tracks.append(Track("Yellow", "Coldplay"))
    # sample_tracks.append(Track("Electric Feel", "MGMT"))
    # sample_tracks.append(Track("Wave", "Beck"))
    # sample_tracks.append(Track("Under the Bridge", "Red Hot Chili Peppers"))

    # get spotify ids of each track using search endpoint
    for track in sample_tracks:
        query_str = urllib.parse.quote(f'track:{track.track} artist:{track.artist}', safe='')
        response = sp.search(f'q:{query_str}', type='track')
        track.track_id = response['tracks']['items'][0]['id']
        track.artist_id = response['tracks']['items'][0]['artists'][0]['id']
        #print(f'track: {track.title}, artist: {track.artist}, track_id: {track.track_id}, artist_id: {track.artist_id}')
        
    # call spotify api recommendations endpoint - only takes 5 seeds
    track_ids = [track.track_id for track in sample_tracks]
    artist_ids = [track.artist_id for track in sample_tracks]

    rec_response = sp.recommendations(seed_tracks=track_ids)
    rec_tracks =  [track['id'] for track in rec_response['tracks']]
    print('recommended tracks: ', rec_tracks)

    # get user id
    user_response = sp.me()
    user_id = user_response['id']

    # create playlist
    create_playlist = sp.user_playlist_create(user_id, 'sample playlist')
    playlist_id = create_playlist['id']

    # add to playlist
    add_tracks = sp.playlist_add_items(playlist_id, rec_tracks)
    print('snapshot_id', add_tracks)
    return playlist_id



    









    