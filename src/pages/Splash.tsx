import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-glow to-accent flex items-center justify-center">
      <div className="text-center animate-bounce">
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl mx-auto mb-6 animate-pulse">
          <div className="text-4xl font-bold text-primary">SC</div>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2 animate-fade-in">
          SmartCare
        </h1>
        <p className="text-xl text-white/90 animate-fade-in-delay">
          Mitra Portal
        </p>
        <div className="mt-8">
          <div className="w-16 h-1 bg-white/30 rounded-full mx-auto overflow-hidden">
            <div className="w-full h-full bg-white rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Splash;