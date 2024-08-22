'use client'
import { createSupabaseClient } from "../utils/client"
import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';

const supabase = createSupabaseClient();

export default function Home() {
  const[accessToken, setAccessToken] = useState('')

  const[fileObj, setFileObj] = useState('') 
  const[fileName, setFileName] = useState('')
  const[base64Output, setBase64Output] = useState('')
  const[open, setOpen] = useState(false)
  const inputFile = useRef(null)

  const[description, setDescription] = useState('')
  const[playlist, setPlaylist] = useState('')
  const[coverImgUrl, setCoverImageUrl] = useState('')
  const[userId, setUserId] = useState('')
  const[isLoading, setLoading] = useState(false)


  useEffect( () => {
    let accessToken = new URL(window.location.href).search.split('access_token=')[1]
    if (accessToken == '') {  
      alert('Please authenticate with Spotify!')

    } 
    else {
      setAccessToken(accessToken)
    }
  })

  const handleSubmit = async () => {
    if (fileObj == '') {
      alert('Please upload a photo!')
    }
    else {
      setLoading(true)
      setOpen(true)

      if (accessToken !== '') {
        const url = `${process.env.NEXT_PUBLIC_API_SERVICE}/upload`
        const formData = new FormData();
        formData.append('imagePath', fileName)
        formData.append('accessToken', accessToken)
        await fetch(url, {
          mode: 'cors',
          method: 'POST',
          body: formData,
        })
        .then((response) => response.json())
        .then(async ({description}) => {
          const descriptionList = description.split(',').map(item => item.trim());
          setDescription(descriptionList);
          return await fetch(`${process.env.NEXT_PUBLIC_API_SERVICE}/get_playlist`, { method:'GET'});
        })
        .then((response) => response.json())
        .then(({playlist, cover_image, user}) => {
          console.log(`playlist: ${playlist}, cover_image: ${cover_image}, user: ${user}`)
          setPlaylist(`https://open.spotify.com/playlist/${playlist}`),
          setCoverImageUrl(cover_image),
          setUserId(user)
        })
        .then(() => setLoading(false))
        .catch((e) => {
          console.error(e)
          alert('Sorry, something went wrong! Try again.')
        })
      } 
      else {
        alert('Please authenticate with Spotify!')
      }
    }

  }

  const refreshComponents = () => {
    setLoading(false)
    setOpen(false)
    setFileObj('')
    setFileName('')
    setBase64Output('')
    setPlaylist('')
    setCoverImageUrl('')
    inputFile.current.value = null
  }
  
  const handleFile = async (e) => {
    let fileObj = e.target.files[0]
    let fileName = e.target.files[0].name

    setFileObj(fileObj)
    setFileName(fileName)
    setPlaylist('')


    const { data, error } = supabase.storage.from('playscene').update('/uploads/' + fileName, fileObj, {
      cacheControl: '3600',
      upsert: true
    })
    console.log('data: ', data)
    console.log('error: ', error)
    let url = process.env.NEXT_PUBLIC_DATABASE_URL + fileName

    urlToBase64(url).then(dataUrl => {
      setBase64Output(dataUrl)
    })
  }

  const urlToBase64 = (url) => fetch(url)
  .then(data => data.blob())
  .then(blob => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
  }))


  return (
    <main className="flex w-full min-h-screen flex-col items-center p-24 gradient-radial">
      <div className="grid gap-4 text-white">
        <h1 className="grid justify-center font-sans font-bold text-3xl">Playscene</h1>
        <h3 className="text-center font-sans">Find your next Spotify playlist for your scene.</h3>
        <a href={`${process.env.NEXT_PUBLIC_API_SERVICE}/login`}
          className="grid mx-4 py-4 place-content-center button border-[2px] border-default-green shadow-md rounded-full bg-default-green text-black font-medium hover:bg-green drop-shadow-md">
          Connect to Spotify</a>          
      </div>

      <div className="grid grid-cols-1 gap-4 pt-4">
        <div className="grid justify-center my-2 mx-2">    
              <label className="grid px-4 pt-4 justify-center text-white font-sans">Upload a photo:</label>
              <input
                type="file"
                required
                onChange={handleFile}
                ref={inputFile}
                className="border border-[2px] text-white rounded-md"/>
              {fileObj ? <p className="grid text-center text-white">Uploaded!</p> : <p></p>}                
        </div>
      </div>
      
      <div className="grid pt-6">
      { isLoading || open ? 
        <Dialog open={open} onClose={refreshComponents} className="relative z-10">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-light-gray bg-opacity-75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
          />
          <div className="fixed inset-0 w-full content-center inset-0 w-screen overflow-y-auto">
            <div className="flex w-full justify-center text-center sm:items-center sm:p-0">
              <DialogPanel
                transition
                className="relative transform overflow-hidden rounded-md text-left text-white shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-lg data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
              >
              <div className="bg-light-black px-4 pb-8 pt-5 sm:p-6 sm:pb-8">
                { playlist === '' || playlist === null ?
                <div>
                  {
                    description === '' || description === null ?
                    <div>
                      <h2 className="flex justify-center font-sans text-white font-semibold">Generating your playlist... </h2>
                      <div className="flex justify-center items-center pt-4 pb-4 bg-opacity-75">
                        <img src={base64Output} width={200} height={200}/>
                      </div>
                    </div>
                    : <div>
                    <h2 className="flex justify-text-center text-white font-sans font-semibold">Sensing the following...</h2>
                      <ul className="list-disc pl-5">
                        {description.map((item, index) => (
                          <li key={index} className="text-white">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  }
                </div>
                : 
                <div className= "grid grid-cols-3 justify-center">
                  <div className="grid justify-items-center pl-2 py-4"> 
                    <img src={coverImgUrl} width={120} height={120}></img>
                  </div>
                  <div className="grid col-span-2 pl-8 py-4">
                    <h2 className="font-sans text-white">Playlist</h2>
                    <h1 className="font-sans text-white font-bold text-2xl">Playscene playlist</h1>
                    <div className="grid justify-items-start">
                      <a href={playlist}
                        className="grid px-4 place-content-center button border-[2px] border-default-green shadow-md rounded-full bg-default-green text-black font-medium hover:bg-green drop-shadow-md">
                        Listen Now
                      </a>
                    </div>
                  </div>
                </div>
                }
              </div>
              </DialogPanel>
            </div>
          </div>
        </Dialog>
          :
          <button onClick={handleSubmit} className="justify-center py-4 px-20 rounded-full bg-violet hover:bg-fuchsia font-medium">
            Generate Playlist
          </button>
      }
    </div>
    </main>
  );
}
