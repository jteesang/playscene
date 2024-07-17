'use client'

import FileZone from "./components/FileZone";
import Webcam from "react-webcam";
import { useState, useEffect, useCallback, useRef } from "react";

export default function Home() {
  const[accessToken, setAccessToken] = useState('')
  const[imgSrc, setImgSrc] = useState(null);
  const[playlist, setPlaylist] = useState('')
  const[isLoading, setLoading] = useState(true)
  const webcamRef = useRef(null);

  useEffect( () => {
    let accessToken = new URL(window.location.href).search.split('access_token=')[1]
    if (accessToken !== undefined) {  
      console.log('access token:', accessToken)
      setAccessToken(accessToken)

      // image upload validation
    
    
    } 
    else {
      console.error('Please authenticate with Spotify!')
    }

  })

  const changeText = (text) => {
    setLoading(text)
  }

  const handleSubmit = async () => {

    let path = "././public/turtle.jpg";
    //console.log('image path: ', path)
    const formData = new FormData();
    formData.append("imagePath", path)
    formData.append("accessToken", accessToken)

    fetch('http://127.0.0.1:8000/upload', {
      mode: 'cors',
      method: 'POST',
      body: formData
    })
    .then((response) => response.json())
    .then(
      (playlist) => setPlaylist("https://open.spotify.com/playlist/" + playlist),

    )
    setLoading(false)
    
  }

  const capture = useCallback( () => {
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);
  }, [webcamRef]);

  const retake = () => {
      setImgSrc(null)
  }
  

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="font-sans font-semibold text-3xl p-8">Playscene</h1>
      <a href="http://127.0.0.1:8000/login" className="button border-[2px] border-default-green shadow-md rounded-full bg-default-green px-8 py-2 text-black font-medium hover:bg-green drop-shadow-md">
        Connect to Spotify</a>
      <div className="grid grid-cols-2 gap-4 pt-4">
        <div>
          <p className="grid pt-4 justify-center">Take a screenshot:</p>
          <div className="grid py-4">
            { imgSrc ? (
                  <img src={imgSrc} alt="webcam"></img>
              ) : (
                  <Webcam audio={false} screenshotFormat="image/jpg" ref={webcamRef}></Webcam>
            )}
            <div className="grid grid-cols-2 justify-center">
              {
                imgSrc ? (
                  <div className="grid col-start-2">
                    <button className="button border-[2px] border-red rounded-full bg-black hover:bg-red px-8 py-2" onClick={retake}>Retake</button>
                  </div>
                ): (
                  <button className="button border-[2px] border-default-green rounded-full bg-black hover:bg-green px-8 py-2" onClick={capture}>Capture</button>
                )}
            </div>
          </div>

        </div>
        <div className="grid">
          <p className="grid pt-4 justify-center">Upload a photo:</p>
          <div className="grid justify-items-center">
            <FileZone/>
          </div>
        </div>
      </div>
      <div className="pt-4">
        <button onClick={handleSubmit} className="p-4 rounded-full bg-gradient-to-r from-violet to-fuchsia hover:bg-green font-medium px-8 py-2">
          Generate Playlist</button>
        { isLoading ? <p></p> : <p className="p-4">Here's your playlist: {playlist}</p>}
      </div>
    </main>
  );
}
