import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";
import SnapshotTable from "./SnapshotTable";
import ResultChart from "./ResultChart";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const localMicTrack = useRef(null);
  const [snapshots, setSnapshots] = useState([]);
  const [currentStep, setCurrentStep] = useState(0); // 0: Define, 1: Set up, 2: Measure, 3: Result
  const isOnMeasurePage = currentStep === 2;
  const [isMicMuted, setIsMicMuted] = useState(false);

  function addRandomSnapshotRow() {
    if (!isOnMeasurePage) return; // Only allow snapshots on Measure page
    setSnapshots((prev) => {
      const nextId = prev.length + 1;
      const pos = (nextId - 1) * 5;
      const maybeNull = () => (Math.random() < 0.15 ? null : undefined);
      const vVal = maybeNull() ?? Number((Math.random() * 30).toFixed(1));
      const hVal = maybeNull() ?? Number((-3 + Math.random() * 25).toFixed(1));
      return [
        ...prev,
        { id: nextId, pos, v: vVal, h: hVal },
      ];
    });
  }

  function goToStep(stepIndex) {
    const bounded = Math.max(0, Math.min(3, stepIndex));
    setCurrentStep(bounded);
  }

  function goNextStep() {
    setCurrentStep((s) => Math.min(3, s + 1));
  }

  function goPreviousStep() {
    setCurrentStep((s) => Math.max(0, s - 1));
  }

  async function startSession() {
    // Get a session token for OpenAI Realtime API
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    // Create a peer connection
    const peerConnection = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    peerConnection.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    localMicTrack.current = ms.getTracks()[0];
    localMicTrack.current.enabled = !isMicMuted;
    peerConnection.addTrack(localMicTrack.current);

    // Set up data channel for sending and receiving events
    const dc = peerConnection.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    await peerConnection.setRemoteDescription(answer);

    peerConnection.current = peerConnection;
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    peerConnection.current.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
    if (localMicTrack.current) {
      localMicTrack.current.stop();
      localMicTrack.current = null;
    }
  }

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      // send event before setting timestamp since the backend peer doesn't expect this field
      dataChannel.send(JSON.stringify(message));

      // if guard just in case the timestamp exists by miracle
      if (!message.timestamp) {
        message.timestamp = timestamp;
      }
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  // Send a text message to the model
  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  function toggleMicMute() {
    setIsMicMuted((prev) => {
      const next = !prev;
      if (localMicTrack.current) {
        localMicTrack.current.enabled = !next;
      }
      return next;
    });
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }

        setEvents((prev) => [event, ...prev]);
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
      });
    }
  }, [dataChannel]);

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center">
        <div className="flex items-center gap-4 w-full m-4 pb-2 border-0 border-b border-solid border-gray-200">
          <img style={{ width: "24px" }} src={logo} />
          <h1>Easy-Laser Agent Demo</h1>
          <div className="ml-6 flex items-center gap-2">
            {[
              { label: "Define" },
              { label: "Set up" },
              { label: "Measure" },
              { label: "Result" },
            ].map((step, idx) => (
              <button
                key={step.label}
                onClick={() => goToStep(idx)}
                className={
                  "px-3 py-1 rounded-md text-sm " +
                  (currentStep === idx
                    ? "bg-orange-400 text-black"
                    : "bg-gray-700 text-white")
                }
              >
                {step.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
      <main className="absolute top-16 left-0 right-0 bottom-0">
        <section className="absolute top-0 left-0 right-[380px] bottom-0 flex">
          <section className="absolute top-0 left-0 right-0 bottom-32 px-4 overflow-y-auto">
            {currentStep === 0 ? (
              <div className="w-full h-full bg-gray-50 rounded-md p-4">
                <h2 className="text-lg font-bold mb-4">Define</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                  <label className="flex flex-col gap-2">
                    <span>Start (mm)</span>
                    <input className="border rounded p-2" placeholder="0" />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span>End (mm)</span>
                    <input className="border rounded p-2" placeholder="20" />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span>Interval (mm)</span>
                    <input className="border rounded p-2" placeholder="5" />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span>Filter level</span>
                    <select className="border rounded p-2">
                      <option>Filter off</option>
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : currentStep === 1 ? (
              <AlignPage />
            ) : currentStep === 2 ? (
              <SnapshotTable rows={snapshots} />
            ) : (
              <ResultChart />
            )}
          </section>
          <section className="absolute h-32 left-0 right-0 bottom-0 p-4">
            <SessionControls
              startSession={startSession}
              stopSession={stopSession}
              sendClientEvent={sendClientEvent}
              sendTextMessage={sendTextMessage}
              events={events}
              isSessionActive={isSessionActive}
              isMicMuted={isMicMuted}
              onToggleMicMute={toggleMicMute}
            />
          </section>
        </section>
        <section className="absolute top-0 w-[380px] right-0 bottom-0 p-4 pt-0 overflow-y-auto">
          <ToolPanel
            sendClientEvent={sendClientEvent}
            sendTextMessage={sendTextMessage}
            events={events}
            isSessionActive={isSessionActive}
            onSnapshot={addRandomSnapshotRow}
            onNextStep={goNextStep}
            onPrevStep={goPreviousStep}
            isOnMeasurePage={isOnMeasurePage}
          />
        </section>
      </main>
    </>
  );
}

function AlignPage() {
  const [connected, setConnected] = useState(false);
  return (
    <div className="w-full h-full bg-gray-50 rounded-md p-4 flex flex-col">
      <h2 className="text-lg font-bold mb-4">Align to axis</h2>
      <div className="flex-1 flex items-center justify-center gap-6">
        <div className="w-72 h-72 bg-gray-800 rounded-xl relative flex items-center justify-center">
          <div className="absolute inset-2 border-2 border-green-400 rounded-lg" />
          <div className="absolute left-1/2 top-2 bottom-2 w-1 bg-orange-400 -translate-x-1/2" />
          <div className="absolute top-1/2 left-2 right-2 h-1 bg-blue-300 -translate-y-1/2" />
          <div className="w-16 h-16 rounded-full bg-red-600 border-4 border-white" />
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setConnected(true)}
            className={
              "px-4 py-2 rounded-md " +
              (connected ? "bg-gray-500 text-white" : "bg-blue-500 text-white")
            }
          >
            {connected ? "Device connected" : "Connect"}
          </button>
          <button className="px-4 py-2 rounded-md bg-gray-700 text-white">Center</button>
          <button className="px-4 py-2 rounded-md bg-gray-700 text-white">Rotate</button>
        </div>
      </div>
    </div>
  );
}
