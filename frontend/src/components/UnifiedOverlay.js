import React, { useEffect, useRef } from 'react';

// Polyfill for roundRect if not supported by older browsers
const drawRoundRect = (ctx, x, y, width, height, radius) => {
    if (ctx.roundRect) {
        ctx.roundRect(x, y, width, height, radius);
        return;
    }
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
};

const getPriorityColor = (distance) => {
    if (!distance) return '#3498db'; // Info Blue
    if (distance <= 1.0) return '#e74c3c'; // Danger Red
    if (distance <= 2.5) return '#f1c40f'; // Warning Yellow
    return '#2ecc71'; // Safe Green
};

const getObjectIcon = (label) => {
    const icons = {
        person: '👤',
        chair: '🪑',
        door: '🚪',
        table: '🪚',
        stairs: '📶',
        car: '🚗',
        bicycle: '🚲',
    };
    return icons[label.toLowerCase()] || '📦';
};

const UnifiedOverlay = ({ videoRef, detections, isCloudMode }) => {
    const overlayRef = useRef(null);
    
    useEffect(() => {
        if (!isCloudMode || !overlayRef.current || !videoRef.current) return;
        
        const canvas = overlayRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        
        // Match canvas size to video size, handle resize
        if (video.videoWidth && video.videoHeight) {
            if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
            if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (detections && detections.length > 0) {
            detections.forEach(obj => {
                const [x1, y1, x2, y2] = obj.bbox;
                const width = x2 - x1;
                const height = y2 - y1;
                
                const color = getPriorityColor(obj.distance_meters);
                const icon = getObjectIcon(obj.label);
                
                // Draw bounding box with rounded corners
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                drawRoundRect(ctx, x1, y1, width, height, 12);
                ctx.stroke();
                
                // Draw inner subtle shadow/fill
                ctx.fillStyle = `${color}1A`; // 10% opacity
                ctx.fill();

                // Typography setup
                ctx.font = '600 14px "Inter", sans-serif';
                ctx.textBaseline = 'middle';
                
                // Label text
                const labelText = `${icon} ${obj.label.charAt(0).toUpperCase() + obj.label.slice(1)}`;
                const confText = `${Math.round(obj.confidence * 100)}%`;
                const distText = obj.distance_meters ? `${obj.distance_meters.toFixed(1)}m` : '';
                
                const labelWidth = ctx.measureText(labelText).width;
                const confWidth = ctx.measureText(confText).width;
                const distWidth = distText ? ctx.measureText(distText).width : 0;
                
                // Draw top badge (Label + Confidence)
                const badgeHeight = 28;
                const padding = 8;
                const totalWidth = labelWidth + confWidth + padding * 3;
                
                ctx.fillStyle = 'rgba(20, 20, 30, 0.85)'; // Dark glass
                ctx.beginPath();
                drawRoundRect(ctx, x1, y1 - badgeHeight - 8, totalWidth, badgeHeight, 8);
                ctx.fill();
                ctx.strokeStyle = `${color}4D`; // 30% border
                ctx.lineWidth = 1;
                ctx.stroke();

                // Draw text inside badge
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(labelText, x1 + padding, y1 - badgeHeight / 2 - 4);
                
                // Confidence color coded
                ctx.fillStyle = color;
                ctx.fillText(confText, x1 + labelWidth + padding * 2, y1 - badgeHeight / 2 - 4);

                // Draw distance badge if available
                if (distText) {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    drawRoundRect(ctx, x1, y1 + height + 8, distWidth + padding * 2, badgeHeight, 8);
                    ctx.fill();

                    ctx.fillStyle = '#000000'; // Dark text on bright background
                    ctx.fillText(distText, x1 + padding, y1 + height + 8 + badgeHeight / 2);
                }
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
