'use client'
import { createSupabaseClient } from "../utils/client"
import { useState, useEffect, useCallback, useRef } from "react";

const supabase = createSupabaseClient();

export default function Home() {
  const[accessToken, setAccessToken] = useState('')

  const[fileObj, setFileObj] = useState('') 
  const[fileName, setFileName] = useState('')
  const inputFile = useRef(null)

  const[playlist, setPlaylist] = useState('')
  const[isLoading, setLoading] = useState(false)
  const webcamRef = useRef(null)


  useEffect( () => {
    console.log('in effect, playlist: ', playlist)
    let accessToken = new URL(window.location.href).search.split('access_token=')[1]
    if (accessToken == '') {  
      alert('Please authenticate with Spotify!')

    } 
    else {
      console.log('access token:', accessToken)
      setAccessToken(accessToken)
    }
  })

  const handleSubmit = async () => {
    if (fileObj == '') {
      alert('Please upload a photo!')
    }
    else {
      setLoading(true)
      showModal()
      if (accessToken !== '') {
        fetch('http://127.0.0.1:8000/upload', {
          mode: 'cors',
          method: 'POST',
          body: JSON.stringify({
            "path": fileName
          }),
          headers: { 
            'Content-Type': 'application/json'
          }
        })
        .then((response) => response.json())
        .then((playlist) => setPlaylist(`https://open.spotify.com/playlist/${playlist}`))
        .then(() => setLoading(false))
      } 
      else {
        alert('Please authenticate with Spotify!')
      }
    }

  }
  const showModal = () => {
    return (
      <div>
        <section>
          <h2>Here's your file: {fileName}</h2>
        </section>
      </div>
    )
  }

  const capture = useCallback( () => {
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);
  }, [webcamRef]);

  const retake = () => {
      setImgSrc(null)
  }
  

  const handleFile = async (e) => {
    let fileObj = e.target.files[0]
    let fileName = e.target.files[0].name

    setFileObj(fileObj)
    setFileName(fileName)
    setPlaylist('')

    const { data, error } = supabase.storage.from('playscene').upload('/uploads/' + fileName, fileObj, {
      cacheControl: '3600',
      upsert: true
    })

  }

  return (
    <main className="flex w-full min-h-screen flex-col items-center p-24 gradient-radial">
      <div className="grid gap-4">
        <h1 className="grid justify-center font-sans font-bold text-3xl">Playscene</h1>
        <h3 className="font-sans">Find your next Spotify playlist for your scene.</h3>
        <a href="http://127.0.0.1:8000/login" 
          className="grid mx-4 py-4 place-content-center button border-[2px] border-default-green shadow-md rounded-full bg-default-green text-black font-medium hover:bg-green drop-shadow-md">
          Connect to Spotify</a>          
      </div>

      <div className="grid grid-cols-1 gap-4 pt-4">
        <div className="">
          <div className="grid my-2 mx-2">    
                <label className="grid px-4 pt-4 justify-center font-sans">Upload a photo:</label>
                <input
                      type="file"
                      required
                      onChange={handleFile}
                      ref={inputFile}
                      className="border border-[2px] rounded-md"/>
                {fileObj ? <p>Uploaded!</p> : <p></p>}                

          </div>
        </div>
      </div>
      <div className="grid pt-6">
        <button onClick={handleSubmit} className="justify-center py-4 px-20 rounded-full bg-violet hover:bg-fuchsia font-medium">
          
          { isLoading ? <span className="animate-pulse">Loading...</span> : 'Generate Playlist'}
        </button>
        { playlist === '' || playlist === null ?
          <p></p>
          : 
          <div className="pt-6">
            <h2 className="justify-center">Here's your playlist:
              <span>
                <button>
                  <a href={playlist}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4m-8-2l8-8m0 0v5m0-5h-5"/></svg>
                  </a>
                </button>
              </span>
            </h2>
          </div>
        } 
      </div>
    </main>
  );
}
