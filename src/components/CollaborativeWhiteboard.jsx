import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { 
  Pencil, Eraser, Square, Circle, Type, 
  Undo, Redo, Trash2, Download, X,
  Minus, Plus, Palette
} from 'lucide-react';

const COLORS = ['#07111D', '#DB9941', '#AE2C11', '#39444D', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];
const TOOLS = [
  { id: 'pen', icon: Pencil, label: 'Pen' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'rect', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'text', icon: Type, label: 'Text' },
];

export default function CollaborativeWhiteboard({ channelId = 'default', onClose }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#07111D');
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTools, setShowTools] = useState(true);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subscribe to real-time drawing events
    const channel = supabase
      .channel(`whiteboard-${channelId}`)
      .on('broadcast', { event: 'draw' }, (payload) => {
        if (payload.payload.userId !== user.id) {
          drawFromData(ctx, payload.payload);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    const coords = getCoordinates(e);
    setIsDrawing(true);
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const coords = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    // Broadcast drawing
    const channel = supabase.channel(`whiteboard-${channelId}`);
    channel.send({
      type: 'broadcast',
      event: 'draw',
      payload: {
        userId: user.id,
        tool,
        color: tool === 'eraser' ? '#FFFFFF' : color,
        lineWidth: tool === 'eraser' ? lineWidth * 3 : lineWidth,
        x: coords.x,
        y: coords.y,
        isDrawing: true,
      },
    });
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const drawFromData = (ctx, data) => {
    if (data.isDrawing) {
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    } else {
      ctx.beginPath();
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const img = new Image();
      img.src = history[newIndex];
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
      };
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const img = new Image();
      img.src = history[newIndex];
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
      };
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(canvas.toDataURL());
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold font-display text-[#07111D]">Collaborative Whiteboard</h2>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-grotesk">
              Live
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={downloadCanvas} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              <Download size={18} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-1">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={`p-2 rounded-lg transition-all ${
                  tool === t.id ? 'bg-[#07111D] text-white' : 'hover:bg-gray-200 text-gray-600'
                }`}
                title={t.label}
              >
                <t.icon size={18} />
              </button>
            ))}
            <div className="w-px h-6 bg-gray-300 mx-2" />
            <button onClick={undo} className="p-2 rounded-lg hover:bg-gray-200 text-gray-600" title="Undo">
              <Undo size={18} />
            </button>
            <button onClick={redo} className="p-2 rounded-lg hover:bg-gray-200 text-gray-600" title="Redo">
              <Redo size={18} />
            </button>
            <button onClick={clearCanvas} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Clear">
              <Trash2 size={18} />
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {/* Color Picker */}
            <div className="flex items-center space-x-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? '#07111D' : 'transparent',
                    boxShadow: color === c ? '0 0 0 2px white, 0 0 0 4px #07111D' : 'none',
                  }}
                />
              ))}
            </div>

            <div className="w-px h-6 bg-gray-300" />

            {/* Line Width */}
            <div className="flex items-center space-x-2">
              <button onClick={() => setLineWidth(Math.max(1, lineWidth - 1))} className="p-1 hover:bg-gray-200 rounded">
                <Minus size={14} />
              </button>
              <div className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: color, width: lineWidth * 4, height: lineWidth * 4 }}>
              </div>
              <button onClick={() => setLineWidth(Math.min(20, lineWidth + 1))} className="p-1 hover:bg-gray-200 rounded">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative bg-white">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
      </div>
    </div>
  );
}