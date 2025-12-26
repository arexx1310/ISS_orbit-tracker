import React, { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { Move, Navigation, Activity, Satellite } from "lucide-react";

export default function App() {
  const globeEl = useRef();
  const [path, setPath] = useState([]);

  // Derive latest position from the end of the path array
  const latestPos = path.length > 0 ? path[path.length - 1] : null;

  /* 1. INITIAL LOAD & LIVE POLLING */
  useEffect(() => {
    // Fetch history first
    const init = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/iss-history?limit=500");
        const data = await res.json();
        if (data.length) setPath(data.map(p => ({ lat: p.lat, lng: p.lon })));
      } catch (err) { console.error("History error:", err); }
    };

    // Fetch latest point every 5s
    const fetchLatest = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/iss-latest");
        const data = await res.json();
        
        setPath(prev => {
          const last = prev[prev.length - 1];
          if (last?.lat === data.lat && last?.lng === data.lon) return prev;
          
          const newPath = [...prev, { lat: data.lat, lng: data.lon }];
          return newPath.slice(-1000); 
        });
      } catch (err) { console.error("Live fetch error:", err); }
    };

    init();
    const interval = setInterval(fetchLatest, 5000);
    return () => clearInterval(interval);
  }, []);

  /* 2. AUTO CAMERA FOLLOW */
  // useEffect(() => {
  //   if (latestPos && globeEl.current) {
  //     globeEl.current.pointOfView({ ...latestPos, altitude: 1.8 }, 1000);
  //   }
  // }, [latestPos]);

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
                <span className="text-[10px] uppercase tracking-widest text-green-400 font-bold">Live Telemetry</span>
              </div>
            </div>
          </div>
        </div>

        {latestPos && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Move size={14} />} label="Lat" value={latestPos.lat.toFixed(4)} />
            <StatCard icon={<Navigation size={14} />} label="Lng" value={latestPos.lng.toFixed(4)} />
            <div className="col-span-2 backdrop-blur-md bg-black/40 border border-white/10 p-3 rounded-xl flex justify-between text-xs">
              <span className="text-slate-400 italic flex items-center gap-2"><Activity size={14}/> Points</span>
              <span className="text-blue-400 font-bold">{path.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* GLOBE VISUALIZATION */}
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="#3a228a"
        atmosphereAltitude={0.15}
        
        pathsData={[path]}
        pathPointLat={p => p.lat}
        pathPointLng={p => p.lng}
        pathColor={() => "#60a5fa"}
        pathStroke={2}
        pathDashLength={0.4}
        pathDashGap={0.1}
        pathDashAnimateTime={12000}

        htmlElementsData={latestPos ? [latestPos] : []}
        htmlElement={() => {
          const el = document.createElement("div");
          el.innerHTML = `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-12 h-12 bg-blue-500/30 rounded-full animate-ping"></div>
              <div class="w-4 h-4 bg-white rounded-full border-2 border-blue-600 shadow-[0_0_10px_white]"></div>
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
