//İstemci tarafında çalışan, WebSocket üzerinden kullanıcıların sesli arama yapmasını sağlayan kodlardır.


//İstemci tarafında çalışan, WebSocket üzerinden kullanıcıların sesli arama yapmasını sağlayan kodlardır.


const socket = new WebSocket("ws://10.57.24.140:3000"); // localde test için bu kullanılacak.




//HTML'deki belirtilen öğelere erişimi sağlar.
const userList = document.getElementById("userList");
const startCallButton = document.getElementById("startCall");
const endCallButton = document.getElementById("endCall");
const statusDiv = document.getElementById("status");
const localAudio = document.getElementById("localAudio");
const remoteAudio = document.getElementById("remoteAudio");
const userIdInput = document.getElementById("userIdInput");
const myID = document.getElementById("myID");


// Gelen çağrı ekranı
const incomingCallDiv = document.createElement("div");
incomingCallDiv.id = "incomingCall";
incomingCallDiv.style.display = "none"; // varsayılan olarak gizledim.
incomingCallDiv.innerHTML = `
  <p id="incomingCallMessage"></p>
  <button id="acceptCall">Accept</button>
  <button id="rejectCall">Reject</button>
`;
document.body.appendChild(incomingCallDiv);

const acceptCallButton = document.getElementById("acceptCall");
const rejectCallButton = document.getElementById("rejectCall");
const incomingCallMessage = document.getElementById("incomingCallMessage");

let localStream;
let peerConnection;

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "register") {
    const currentUserID = data.userID; // Sunucudan gelen ID
    console.log(`Your ID: ${currentUserID}`);

    // HTML'deki "myID" öğesine bu ID'yi yazdırıyoruz
    myID.textContent = currentUserID;
  }
};





//ICE Sunucuları: WebRTC bağlantısını kurmak için kullanılan STUN Suncusudur.
// birden fazla url eklenebilir buraya
const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};




// Arama Kabul Etme ve ya Reddetme
// handleOffer, bir çağrı geldiğinde çalışır.
async function handleOffer(offer, from) {
  selectedUserID = from;

  // Gelen arama ekranını görünür yapma
  incomingCallDiv.style.display = "block";

  // Aramanın kimden geldiğini içeren mesaj
  incomingCallMessage.textContent = `Incoming call from ${from}`;
  
  // ----- Kabul et butonu tıklandığında -----
  acceptCallButton.onclick = async () => {
    // Gelen arama ekranını kapat.
    incomingCallDiv.style.display = "none";

    // WebRTC bağlantısı için bir RTCPeerConnection nesnesi oluşturulur.
    createPeerConnection();
    // Gelen offer'ın bilgisini peerConnection'a uzaktan oturum tanımı
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer)); //RTCSessionDescription: WebRTC'de oturum bilgilerini içeren bir nesne.

    // Offer'a karşılık verilen cevap, yani Kabul Etme olayı.
    const answer = await peerConnection.createAnswer();
    // Cevabı peerConncection'a uygular
    await peerConnection.setLocalDescription(answer);

    socket.send(
      JSON.stringify({ // javascript'i JSON formatına dönüştürür.
        type: "answer", // answer, websocket üzerinden karşı tarafa gönderilir.
        // Gönderilen bilgiler
        answer, // aramanın cevabı
        target: from, //cevabın hedefi, yani arayan
        from: currentUserID, // cevabı veren kişinin kullanıcı kimliği
      })
    );
    updateStatus(`In call with ${from}`); //... kişiyle görüşme yapılıyor.
    startCallButton.classList.add("hidden"); //arama butonunu gizleme
    endCallButton.classList.remove("hidden"); //bitirme butonunu aktif etme
  };

  // ----- Reddet butonuna tıklabdığında -----
  rejectCallButton.onclick = () => {
    // Gelen arama ekranını kapat.
    incomingCallDiv.style.display = "none";


    //JSON.stringify, JavaScript nesnelerini JSON formatına çevirerek WebSocket mesajlarını 
    //anlaşılır, taşınabilir ve standart bir şekilde karşı tarafa iletmemizi sağlar.
    socket.send(
      JSON.stringify({
        type: "rejectCall",
        target: from,
        from: currentUserID,
      })
    );
    updateStatus(` ${from} rejected`); // ...'dan gelen arama reddedildi
  };
}