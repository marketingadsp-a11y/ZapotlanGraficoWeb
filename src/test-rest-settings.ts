import axios from "axios";

async function testApiWithUrl() {
  const url = "https://www.youtube.com/@ZapotlánGraficoMX";
  console.log("Original URL in JS:", url);
  
  // Encode as query param
  const encodedUrl = encodeURIComponent(url);
  const apiCall = `http://localhost:3000/api/youtube-channel-videos?url=${encodedUrl}`;
  console.log("API CALL:", apiCall);

  try {
    const res = await axios.get(apiCall);
    console.log("STATUS:", res.status);
    console.log("VIDEOS COUNT:", res.data.videos?.length);
    if (res.data.videos && res.data.videos.length > 0) {
      console.log("First video:", res.data.videos[0]);
    }
  } catch (err: any) {
    console.log("ERROR STATUS:", err.response?.status);
    console.log("ERROR DATA:", JSON.stringify(err.response?.data, null, 2));
  }
}

testApiWithUrl();
