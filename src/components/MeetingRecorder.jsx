import { useState, useRef } from 'react';
import { Mic, Square, Play, Pause, Loader, AlertCircle, Check, Upload, X, Sparkles, FileText, Clock, Users } from 'lucide-react';
import { BrowserTranscriber, generateMeetingInsights } from '../lib/ai';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

export default function MeetingRecorder({ onMeetingProcessed }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [insights, setInsights] = useState(null);
  const [step, setStep] = useState('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const transcriberRef = useRef(null);
  const streamRef = useRef(null);
  
  const organization = useAuthStore(state => state.organization);
  const user = useAuthStore(state => state.user);

  const startRecording = async () => {
    try {
      if (!organization?.id) {
        toast.error('No organization found. Please set up your organization first.');
        return;
      }

      if (!user?.id) {
        toast.error('Please log in again.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      // Start recording
      mediaRecorder.start(1000);
      setIsRecording(true);
      setStep('recording');
      
      // Start timer
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval);
      
      toast.success('Recording started! Speak clearly into your microphone.');
      
      // Try to start live transcription
      try {
        if (!transcriberRef.current) {
          transcriberRef.current = new BrowserTranscriber();
        }
        
        transcriberRef.current.startListening(
          (result) => {
            setTranscript(result.final);
            setInterimTranscript(result.interim);
          },
          (error) => {
            console.log('Speech recognition not available:', error);
            setManualMode(true);
            toast('Speech recognition not available. You can type the transcript manually.', { 
              icon: 'ℹ️',
              duration: 5000 
            });
          }
        );
      } catch (error) {
        console.log('Browser transcription not available');
        setManualMode(true);
      }
      
    } catch (error) {
      console.error('Recording error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found. Please connect a microphone.');
      } else {
        toast.error('Failed to start recording: ' + error.message);
      }
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (transcriberRef.current) {
        transcriberRef.current.stopListening();
      }
      
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      
      setIsRecording(false);
      setIsPaused(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const togglePause = () => {
    try {
      if (mediaRecorderRef.current) {
        if (isPaused) {
          mediaRecorderRef.current.resume();
          const interval = setInterval(() => {
            setRecordingTime(prev => prev + 1);
          }, 1000);
          setTimerInterval(interval);
          toast.success('Recording resumed');
        } else {
          mediaRecorderRef.current.pause();
          if (timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
          }
          toast.success('Recording paused');
        }
        setIsPaused(!isPaused);
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  };

  const processRecording = async () => {
    if (!organization?.id) {
      toast.error('Organization not found. Please refresh the page.');
      return;
    }

    if (!user?.id) {
      toast.error('User session expired. Please log in again.');
      return;
    }

    if (!transcript.trim() && !audioBlob) {
      toast.error('No recording or transcript available. Please record something first.');
      return;
    }

    if (!transcript.trim()) {
      toast.error('Please provide a transcript. Speak during recording or type it manually.');
      return;
    }
    
    setProcessing(true);
    setStep('processing');

    try {
      let recordingUrl = null;

      // Upload audio if available
      if (audioBlob) {
        try {
          const fileName = `recording-${Date.now()}.${audioBlob.type.includes('webm') ? 'webm' : 'mp4'}`;
          const filePath = `${organization.id}/${fileName}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('meeting-recordings')
            .upload(filePath, audioBlob, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            toast.error('Failed to upload recording, but will continue processing transcript.');
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('meeting-recordings')
              .getPublicUrl(filePath);
            recordingUrl = publicUrl;
            toast.success('Recording uploaded!');
          }
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
        }
      }

      // Generate insights from transcript
      toast.loading('Analyzing transcript...');
      const meetingInsights = await generateMeetingInsights(transcript);
      setInsights(meetingInsights);
      toast.dismiss();
      toast.success('Analysis complete!');

      // Save meeting to database
      const meetingData = {
        organization_id: organization.id,
        title: `Meeting - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        recording_url: recordingUrl,
        transcript: transcript,
        summary: meetingInsights.summary || '',
        highlights: meetingInsights.highlights || [],
        decisions: meetingInsights.decisions || [],
        risks: meetingInsights.risks || [],
        questions: meetingInsights.questions || [],
        status: 'completed',
        created_by: user.id,
        start_time: new Date().toISOString(),
      };

      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert(meetingData)
        .select()
        .single();

      if (meetingError) {
        console.error('Meeting save error:', meetingError);
        toast.error('Failed to save meeting data');
      }

      // Save extracted tasks
      if (meetingInsights.action_items?.length > 0 && meeting) {
        try {
          const taskInserts = meetingInsights.action_items.map(task => ({
            project_id: null,
            title: task.title || 'Untitled Task',
            description: task.description || '',
            priority: task.priority || 'medium',
            status: 'todo',
            created_by: user.id,
            due_date: task.deadline ? new Date(task.deadline) : null,
          }));

          const { error: taskError } = await supabase
            .from('tasks')
            .insert(taskInserts);

          if (taskError) {
            console.error('Task save error:', taskError);
          } else {
            toast.success(`${taskInserts.length} tasks created from meeting!`);
          }
        } catch (taskError) {
          console.error('Task creation error:', taskError);
        }
      }

      setStep('done');

      if (onMeetingProcessed) {
        onMeetingProcessed({ 
          meeting, 
          tasks: meetingInsights.action_items, 
          insights: meetingInsights 
        });
      }

    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Failed to process recording: ' + error.message);
      setStep('recording');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setTranscript('');
    setInterimTranscript('');
    setInsights(null);
    setStep('idle');
    setManualMode(false);
    setProcessing(false);
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="rounded-2xl border p-8" style={{ 
      backgroundColor: '#FFFFFF', 
      borderColor: '#39444D20',
      boxShadow: '0 10px 40px rgba(7, 17, 29, 0.08)'
    }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#07111D] font-display">Meeting Recorder</h2>
        <span className="px-3 py-1 rounded-full text-xs font-semibold font-grotesk" 
          style={{ backgroundColor: '#10B98120', color: '#10B981', border: '1px solid #10B98130' }}>
          FREE - Browser Based
        </span>
      </div>
      
      {/* No Organization Warning */}
      {!organization && (
        <div className="mb-6 p-4 rounded-xl flex items-start space-x-3" 
          style={{ backgroundColor: '#DB994110', border: '1px solid #DB994130' }}>
          <AlertCircle size={20} className="text-[#DB9941] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#DB9941] font-grotesk">No Organization Found</p>
            <p className="text-xs text-[#5D5D5D] mt-1 font-grotesk">
              Please create or join an organization before recording meetings.
            </p>
          </div>
        </div>
      )}

      {/* Idle State */}
      {step === 'idle' && (
        <div className="text-center py-12">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse"
            style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)', boxShadow: '0 10px 40px rgba(219, 153, 65, 0.4)' }}>
            <Mic size={40} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-[#07111D] mb-3 font-display">Ready to Record</h3>
          <p className="text-[#5D5D5D] mb-8 font-grotesk max-w-md mx-auto">
            Click the button below to start recording your meeting. 
            Your browser will transcribe the audio in real-time.
          </p>
          <button
            onClick={startRecording}
            disabled={!organization}
            className="inline-flex items-center px-8 py-4 rounded-xl text-white font-bold text-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-grotesk"
            style={{ 
              background: 'linear-gradient(135deg, #DB9941, #AE2C11)',
              boxShadow: '0 10px 30px rgba(219, 153, 65, 0.3)'
            }}
          >
            <Mic className="mr-3" size={24} />
            Start Recording
          </button>
          <p className="text-xs text-[#5D5D5D] mt-4 font-grotesk">
            Works best in Chrome • Microphone access required
          </p>
        </div>
      )}

      {/* Recording State */}
      {step === 'recording' && (
        <div className="space-y-6">
          {/* Recording Indicator */}
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-3 px-6 py-3 rounded-full" 
              style={{ backgroundColor: '#AE2C1110', border: '2px solid #AE2C1130' }}>
              <div className="w-4 h-4 rounded-full bg-[#AE2C11] animate-pulse"></div>
              <span className="text-lg font-bold text-[#AE2C11] font-grotesk">
                {isPaused ? '⏸️ PAUSED' : '🔴 RECORDING'}
              </span>
            </div>
            <span className="text-2xl font-bold text-[#07111D] font-mono">
              {formatTime(recordingTime)}
            </span>
          </div>
          
          {/* Controls */}
          <div className="flex justify-center space-x-4">
            <button 
              onClick={togglePause} 
              className="p-4 rounded-full transition-all hover:scale-110 border"
              style={{ 
                backgroundColor: '#E5E5DF', 
                borderColor: '#39444D20',
                color: '#39444D'
              }}
            >
              {isPaused ? <Play size={24} /> : <Pause size={24} />}
            </button>
            <button 
              onClick={stopRecording} 
              className="p-4 rounded-full transition-all hover:scale-110"
              style={{ 
                backgroundColor: '#AE2C11', 
                color: 'white',
                boxShadow: '0 4px 15px rgba(174, 44, 17, 0.3)'
              }}
            >
              <Square size={24} />
            </button>
          </div>

          {/* Live Transcription */}
          {(transcript || interimTranscript) && (
            <div className="p-5 rounded-xl border" style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D10' }}>
              <p className="text-xs font-semibold text-[#5D5D5D] mb-3 font-grotesk uppercase tracking-wider">
                LIVE TRANSCRIPTION
              </p>
              <div className="max-h-40 overflow-y-auto">
                <p className="text-sm text-[#07111D] leading-relaxed font-grotesk">
                  {transcript}
                  <span className="text-[#DB9941] italic">{interimTranscript}</span>
                </p>
              </div>
            </div>
          )}

          {/* Manual Mode Info */}
          {manualMode && (
            <div className="p-4 rounded-xl border" style={{ backgroundColor: '#DB994110', borderColor: '#DB994130' }}>
              <div className="flex items-start space-x-3">
                <Sparkles size={20} className="text-[#DB9941] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#DB9941] font-grotesk">Manual Transcription Mode</p>
                  <p className="text-xs text-[#5D5D5D] mt-1 font-grotesk">
                    Speech recognition is not available in your browser. You can type or paste your transcript manually below.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Manual Transcript Input */}
          <div>
            <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">
              📝 Transcript {manualMode ? '(Type or paste here)' : '(Auto-filled from speech)'}
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] transition-all font-grotesk resize-none"
              style={{ 
                backgroundColor: '#E5E5DF', 
                borderColor: '#39444D20', 
                color: '#07111D'
              }}
              rows={5}
              placeholder="Type or paste your meeting transcript here..."
            />
          </div>

          {/* Audio Preview */}
          {audioUrl && (
            <div className="p-4 rounded-xl border" style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D10' }}>
              <p className="text-sm font-semibold text-[#07111D] mb-3 font-grotesk">Recording Preview:</p>
              <audio controls src={audioUrl} className="w-full" />
            </div>
          )}

          {/* Process Button */}
          <button
            onClick={processRecording}
            disabled={processing || !transcript.trim()}
            className="w-full px-6 py-4 rounded-xl text-white font-bold text-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-grotesk"
            style={{ 
              background: transcript.trim() 
                ? 'linear-gradient(135deg, #DB9941, #AE2C11)' 
                : '#E5E5DF',
              color: transcript.trim() ? 'white' : '#5D5D5D',
              boxShadow: transcript.trim() ? '0 10px 30px rgba(219, 153, 65, 0.3)' : 'none'
            }}
          >
            {processing ? (
              <span className="flex items-center justify-center">
                <Loader className="animate-spin mr-3" size={22} />
                Processing...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <Sparkles className="mr-3" size={22} />
                Process Meeting & Extract Tasks
              </span>
            )}
          </button>
        </div>
      )}

      {/* Processing State */}
      {step === 'processing' && (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>
            <Loader className="animate-spin text-white" size={36} />
          </div>
          <h3 className="text-2xl font-bold text-[#07111D] mb-3 font-display">Processing Meeting</h3>
          <p className="text-[#5D5D5D] mb-8 font-grotesk">
            Analyzing transcript and extracting insights...
          </p>
          <div className="max-w-xs mx-auto space-y-3">
            {[
              { icon: Check, label: 'Uploading recording...', color: '#10B981' },
              { icon: Loader, label: 'Transcribing audio...', color: '#DB9941', animate: true },
              { icon: Sparkles, label: 'Extracting action items...', color: '#39444D' },
              { icon: FileText, label: 'Generating summary...', color: '#5D5D5D' },
            ].map((item, i) => (
              <div key={i} className="flex items-center space-x-3">
                <item.icon size={18} style={{ color: item.color }} className={item.animate ? 'animate-spin' : ''} />
                <span className="text-sm text-[#39444D] font-grotesk">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results State */}
      {step === 'done' && insights && (
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="p-4 rounded-xl flex items-center space-x-3" 
            style={{ backgroundColor: '#10B98110', border: '1px solid #10B98130' }}>
            <Check size={24} className="text-[#10B981]" />
            <div>
              <p className="font-bold text-[#10B981] font-grotesk">Meeting Processed Successfully!</p>
              <p className="text-xs text-[#5D5D5D] font-grotesk">
                {insights.action_items?.length || 0} tasks extracted • {insights.decisions?.length || 0} decisions recorded
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="p-5 rounded-xl border" style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D10' }}>
            <h3 className="font-bold text-[#07111D] mb-3 font-display flex items-center text-lg">
              <Sparkles size={20} className="mr-2 text-[#DB9941]" />
              Summary
            </h3>
            <p className="text-sm text-[#39444D] leading-relaxed font-grotesk">{insights.summary}</p>
          </div>

          {/* Highlights */}
          {insights.highlights?.length > 0 && (
            <div>
              <h3 className="font-bold text-[#07111D] mb-3 font-display text-lg">Key Highlights</h3>
              <div className="space-y-2">
                {insights.highlights.map((highlight, i) => (
                  <div key={i} className="flex items-start space-x-3 p-3 rounded-lg" 
                    style={{ backgroundColor: '#DB994110', border: '1px solid #DB994120' }}>
                    <div className="w-6 h-6 rounded-full bg-[#DB9941] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">{i + 1}</span>
                    </div>
                    <p className="text-sm text-[#07111D] font-grotesk">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items */}
          {insights.action_items?.length > 0 && (
            <div>
              <h3 className="font-bold text-[#07111D] mb-3 font-display text-lg flex items-center">
                <Check size={20} className="mr-2 text-[#10B981]" />
                Action Items ({insights.action_items.length})
              </h3>
              <div className="space-y-3">
                {insights.action_items.map((item, i) => (
                  <div key={i} className="p-4 rounded-xl border transition-all hover:shadow-md"
                    style={{ 
                      backgroundColor: '#FFFFFF', 
                      borderColor: '#39444D10',
                      boxShadow: '0 2px 10px rgba(7, 17, 29, 0.03)'
                    }}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-[#07111D] font-grotesk">{item.title}</h4>
                      <span className="px-3 py-1 rounded-full text-xs font-bold font-grotesk"
                        style={{ 
                          backgroundColor: item.priority === 'high' || item.priority === 'urgent' 
                            ? '#AE2C1120' : '#DB994120',
                          color: item.priority === 'high' || item.priority === 'urgent' 
                            ? '#AE2C11' : '#DB9941',
                          border: `1px solid ${item.priority === 'high' || item.priority === 'urgent' ? '#AE2C1130' : '#DB994130'}`
                        }}>
                        {item.priority || 'medium'}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-[#5D5D5D] mb-3 font-grotesk">{item.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="flex items-center text-[#5D5D5D] font-grotesk">
                        <Users size={14} className="mr-1.5" />
                        {item.assignee || 'Unassigned'}
                      </span>
                      <span className="flex items-center text-[#5D5D5D] font-grotesk">
                        <Clock size={14} className="mr-1.5" />
                        {item.deadline || 'No deadline'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decisions */}
          {insights.decisions?.length > 0 && (
            <div>
              <h3 className="font-bold text-[#07111D] mb-3 font-display text-lg">Decisions Made</h3>
              <div className="space-y-2">
                {insights.decisions.map((decision, i) => (
                  <div key={i} className="flex items-start space-x-3 p-3 rounded-lg"
                    style={{ backgroundColor: '#39444D10', border: '1px solid #39444D20' }}>
                    <Check size={16} className="text-[#39444D] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[#07111D] font-grotesk">{decision}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Transcript */}
          {transcript && (
            <div>
              <h3 className="font-bold text-[#07111D] mb-3 font-display text-lg flex items-center">
                <FileText size={20} className="mr-2 text-[#39444D]" />
                Full Transcript
              </h3>
              <div className="p-4 rounded-xl max-h-48 overflow-y-auto" 
                style={{ backgroundColor: '#E5E5DF', border: '1px solid #39444D10' }}>
                <p className="text-sm text-[#39444D] leading-relaxed whitespace-pre-wrap font-grotesk">
                  {transcript}
                </p>
              </div>
            </div>
          )}

          {/* Reset Button */}
          <button
            onClick={reset}
            className="w-full px-6 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 font-grotesk"
            style={{ 
              backgroundColor: '#E5E5DF', 
              color: '#39444D',
              border: '2px solid #39444D20'
            }}
          >
            Record Another Meeting
          </button>
        </div>
      )}
    </div>
  );
}