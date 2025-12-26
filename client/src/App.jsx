/* App.jsx */
import React, { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { Move, Navigation, Activity, Satellite } from "lucide-react";

export default function App() {
  const globeEl = useRef();
  const [path, setPath] = useState([]);
  const [isAutoFollow, setIsAutoFollow] = useState(true);

  const latestPos = path.length > 0 ? path[path.length - 1] : null;

  // 1. Fetch History on mount & start Polling
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("https://iss-orbit-tracker.onrender.com/api/iss-history");
        const data = await res.json();
        if (data.length) {
          const formatted = data.map(p => ({ lat: p.lat, lng: p.lon }));
          setPath(formatted);
        }
      } catch (err) { console.error("History error:", err); }
    };

    const fetchLatest = async () => {
      try {
        const res = await fetch("https://iss-orbit-tracker.onrender.com/api/iss-latest");
        if (!res.ok) return;
        const data = await res.json();
        
        setPath(prev => {
          const last = prev[prev.length - 1];
          // Avoid duplicate points
          if (last?.lat === data.lat && last?.lng === data.lon) return prev;
          return [...prev, { lat: data.lat, lng: data.lon }].slice(-500);
        });
      } catch (err) { console.error("Live fetch error:", err); }
    };

    fetchHistory();
    const interval = setInterval(fetchLatest, 5000);
    return () => clearInterval(interval);
  }, []);

  // 2. Smooth Camera Follow
  useEffect(() => {
    if (latestPos && globeEl.current && isAutoFollow) {
      globeEl.current.pointOfView({ 
        lat: latestPos.lat, 
        lng: latestPos.lng, 
        altitude: 2.0 
      }, 1000);
    }
  }, [latestPos, isAutoFollow]);

  return (
    <div className="w-screen h-screen bg-[#050505] overflow-hidden font-sans text-slate-200">
      
      {/* HUD UI */}
      <div className="absolute top-8 left-8 z-20 flex flex-col gap-4">
        <div className="backdrop-blur-md bg-white/10 border border-white/20 p-6 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Satellite size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white uppercase">ISS Tracker</h1>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest text-green-400 font-bold">Live Orbit</span>
              </div>
            </div>
          </div>
        </div>

        {latestPos && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Move size={14} />} label="Latitude" value={latestPos.lat.toFixed(4)} />
            <StatCard icon={<Navigation size={14} />} label="Longitude" value={latestPos.lng.toFixed(4)} />
            
            <button 
              onClick={() => setIsAutoFollow(!isAutoFollow)}
              className={`col-span-2 p-2 rounded-xl text-[10px] uppercase font-bold transition-all border ${
                isAutoFollow ? 'bg-blue-600/40 border-blue-400' : 'bg-black/40 border-white/10'
              }`}
            >
              {isAutoFollow ? "Auto-Follow: ON" : "Auto-Follow: OFF"}
            </button>
          </div>
        )}
      </div>

      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="#3a228a"
        atmosphereAltitude={0.15}
        
        // Path rendering
        pathsData={[path]}
        pathPointLat={p => p.lat}
        pathPointLng={p => p.lng}
        pathColor={() => "#60a5fa"}
        pathStroke={2}
        pathDashLength={0.4}
        pathDashGap={0.05}
        pathDashAnimateTime={10000}

        // Current Location Marker
        htmlElementsData={latestPos ? [latestPos] : []}
        htmlElement={() => {
          const el = document.createElement("div");
          el.innerHTML = `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-12 h-12 bg-blue-500/30 rounded-full animate-ping"></div>
              <div class="w-4 h-4 bg-white rounded-full border-2 border-blue-600 shadow-[0_0_15px_rgba(255,255,255,0.8)]"></div>
            </div>`;
          return el;
        }}
      />
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="backdrop-blur-md bg-black/40 border border-white/10 p-3 rounded-xl">
      <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase mb-1">
        {icon} {label}
      </div>
      <div className="text-white font-mono text-lg">{value}</div>
    </div>
  );
}
