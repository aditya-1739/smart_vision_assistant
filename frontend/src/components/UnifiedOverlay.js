import React, { useEffect, useRef } from 'react';

const UnifiedOverlay = ({ videoRef, detections, isCloudMode }) => {
    const overlayRef = useRef(null);
    
    useEffect(() => {
        if (!isCloudMode || !overlayRef.current || !videoRef.current) return;
        
        const canvas = overlayRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        
        // Match canvas size to video size
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (detections && detections.length > 0) {
            detections.forEach(obj => {
                const [x1, y1, x2, y2] = obj.bbox;
                const width = x2 - x1;
                const height = y2 - y1;
                
                // Draw bounding box
                ctx.strokeStyle = '#00FF00';
                ctx.lineWidth = 2;
                ctx.strokeRect(x1, y1, width, height);
                
                // Draw label background
                ctx.fillStyle = '#00FF00';
                const text = `${obj.label} ${Math.round(obj.confidence * 100)}%`;
                const textWidth = ctx.measureText(text).width;
                ctx.fillRect(x1, y1 - 20, textWidth + 10, 20);
                
                // Draw text
                ctx.fillStyle = '#000000';
                ctx.font = '14px Arial';
                ctx.fillText(text, x1 + 5, y1 - 5);
            });
        }
    }, [detections, isCloudMode, videoRef]);
    
    if (!isCloudMode) return null;
    
    return (
        <canvas
            ref={overlayRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
            }}
        />
    );
};

export default UnifiedOverlay;
