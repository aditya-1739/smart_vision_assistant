import { useEffect, useRef, useState } from 'react';

export const useWebRTC = (socket, isActive) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null); // hidden canvas for capturing
    const [stream, setStream] = useState(null);
    
    useEffect(() => {
        if (!isActive) return;
        
        let activeStream = null;
        const initCamera = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } 
                });
                setStream(s);
                activeStream = s;
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                    videoRef.current.play();
                }
            } catch (err) {
                console.error("Failed to access camera:", err);
            }
        };
        
        initCamera();
        
        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isActive]);
    
    useEffect(() => {
        if (!isActive || !stream || !socket) return;
        
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let intervalId;
        
        const sendFrame = () => {
            if (video.videoWidth === 0) return;
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((blob) => {
                if (blob && socket.connected) {
                    socket.emit('v1/process_frame', blob);
                }
            }, 'image/jpeg', 0.6); // Compress to binary JPEG
        };
        
        // Target 2 FPS for Cloud Mode to prevent starving the free Render CPU
        intervalId = setInterval(sendFrame, 1000 / 2);
        
        return () => clearInterval(intervalId);
    }, [isActive, stream, socket]);
    
    return { videoRef, canvasRef };
};
