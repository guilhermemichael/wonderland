"use client";

import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiBaseUrl, apiEventsUrl } from "../../lib/api-client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment, PresentationControls, Html } from "@react-three/drei";
import { trackEvent as globalTrackEvent, EventName } from "../../lib/analytics";
import gsap from "gsap";

function PocketWatchModel(props: any) {
  const { scene } = useGLTF("/models/pocket-watch.web.glb");
  const modelRef = useRef<any>(null);

  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <primitive 
      ref={modelRef}
      object={scene} 
      scale={2} 
      position={[0, 0, 0]} 
      {...props} 
    />
  );
}

useGLTF.preload("/models/pocket-watch.web.glb");

export function ClientRabbitExperience() {
  const [phase, setPhase] = useState<"arrival" | "watch" | "trail" | "threshold">("arrival");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Basic session init or retrieval logic here
    const sid = localStorage.getItem("wonderland_session_id");
    if (sid) {
      setSessionId(sid);
      // Fetch initial state
      fetch(`${apiBaseUrl()}/sessions/${sid}/rabbit`)
        .then(res => res.json())
        .then(data => {
          if (data.has_reached_threshold) setPhase("threshold");
          else if (data.has_followed_trail) setPhase("threshold");
          else if (data.has_taken_watch) setPhase("trail");
        })
        .catch(console.error);
    }
  }, []);

  const updateProgress = useCallback(async (updates: any) => {
    if (!sessionId) return;
    try {
      await fetch(`${apiBaseUrl()}/sessions/${sessionId}/rabbit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error("Failed to update rabbit progress", error);
    }
  }, [sessionId]);

  useEffect(() => {
    if (phase === "arrival") {
      globalTrackEvent({ event_name: "rabbit_started", page: "/rabbit" });
      const timer = setTimeout(() => {
        setPhase("watch");
      }, 3000);
      return () => clearTimeout(timer);
    } else if (phase === "watch") {
      globalTrackEvent({ event_name: "rabbit_watch_seen", page: "/rabbit" });
    } else if (phase === "trail") {
      globalTrackEvent({ event_name: "rabbit_trail_started", page: "/rabbit" });
    } else if (phase === "threshold") {
      globalTrackEvent({ event_name: "rabbit_threshold_reached", page: "/rabbit" });
    }
  }, [phase]);

  const handleTakeWatch = () => {
    updateProgress({ has_taken_watch: true });
    globalTrackEvent({ event_name: "rabbit_watch_taken", page: "/rabbit" });
    setPhase("trail");
  };

  const handleFollowTrail = () => {
    updateProgress({ has_followed_trail: true, has_reached_threshold: true });
    setPhase("threshold");
  };

  const handleEnterWonderland = () => {
    router.push("/crossroads"); // Or whatever the next logical step is
  };

  return (
    <div className="rabbit-experience-container" style={{ overflowX: 'hidden' }}>
      {phase === "arrival" && (
        <div className="phase-arrival fade-in">
          <h1 className="rabbit-title">Curious, aren't you?</h1>
        </div>
      )}

      {phase === "watch" && (
        <div className="phase-watch fade-in">
          <div className="canvas-container" style={{ width: '100%', height: '60vh' }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
              <ambientLight intensity={0.5} />
              <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
              <PresentationControls 
                global 
                snap={true} 
                rotation={[0, 0, 0]} 
                polar={[-Math.PI / 3, Math.PI / 3]} 
                azimuth={[-Math.PI / 1.4, Math.PI / 2]}
              >
                <Suspense fallback={<Html center>Loading time...</Html>}>
                  <PocketWatchModel />
                  <Environment preset="city" />
                </Suspense>
              </PresentationControls>
            </Canvas>
          </div>
          <div className="watch-content text-center mt-8">
            <p className="rabbit-subtitle">Time is relative here. Take it.</p>
            <button className="primary-cta mt-4" onClick={handleTakeWatch}>
              Take the Watch
            </button>
          </div>
        </div>
      )}

      {phase === "trail" && (
        <div className="phase-trail fade-in">
          <div className="canvas-container" style={{ width: '100vw', height: '20vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="rabbit-subtitle">You are on the trail...</p>
          </div>
          <h2 className="rabbit-title text-center mt-4">Follow the trail</h2>
          <div className="trail-interaction flex justify-center mt-4">
            <button className="secondary-cta" onClick={handleFollowTrail}>
              Step forward
            </button>
          </div>
        </div>
      )}

      {phase === "threshold" && (
        <div className="phase-threshold fade-in">
          <h1 className="rabbit-title">The real wonderland begins here.</h1>
          <div className="flex justify-center mt-8">
            <button className="primary-cta" onClick={handleEnterWonderland}>
              Enter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
