import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BehaviorTracker } from '../lib/behaviorTracker';
import type { BehavioralFeatures } from '../lib/behaviorTracker';
import { stressModel } from '../lib/stressModel';
import {
  analyzeFacialVideo,
  createEmptyEmotionProfile,
} from '../lib/facialBackend';
import type { EmotionProfile, FacialBackendMetrics } from '../lib/facialBackend';
import {
  Brain, MousePointer2, Camera, BarChart3, ChevronRight,
  User, CheckCircle2, AlertCircle, TrendingUp, X, ScanFace, Upload,
  FileVideo, LoaderCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';

interface UnifiedAssessmentProps {
  onClose: () => void;
}

interface AdvancedMetrics {
  darkCircles: number;
  dullness: number;
  tensionIndex: number;
  fatigueScore: number;
}

const defaultAdvancedMetrics: AdvancedMetrics = {
  darkCircles: 0,
  dullness: 0,
  tensionIndex: 0,
  fatigueScore: 0,
};

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(value, max));

const getStressLevel = (score: number) => {
  if (score > 0.7) return { label: 'High', color: 'text-red-500', bg: 'bg-red-500/10' };
  if (score > 0.35) return { label: 'Moderate', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
  return { label: 'Low', color: 'text-brand-green', bg: 'bg-brand-green/10' };
};

const buildRadarData = (
  facialScore: number,
  emotionProfile: EmotionProfile,
  advancedMetrics: AdvancedMetrics,
  behavioralData: BehavioralFeatures | null,
) => [
  {
    subject: 'Relaxed',
    A: Math.round((emotionProfile.neutral + emotionProfile.happy) * 100),
  },
  {
    subject: 'Anxious',
    A: Math.round((emotionProfile.fearful + emotionProfile.sad) * 100),
  },
  {
    subject: 'Focused',
    A: behavioralData ? Math.min(100, Math.round(behavioralData.typingSpeed / 6)) : Math.round(emotionProfile.neutral * 100),
  },
  {
    subject: 'Fatigued',
    A: Math.round(advancedMetrics.fatigueScore),
  },
  {
    subject: 'Agitated',
    A: Math.min(100, Math.round((emotionProfile.angry + emotionProfile.disgusted + emotionProfile.surprised + facialScore * 0.25) * 100)),
  },
];

export const UnifiedAssessment: React.FC<UnifiedAssessmentProps> = ({ onClose }) => {
  const [phase, setPhase] = useState<'intro' | 'behavioral' | 'facial' | 'analyzing' | 'report'>('intro');
  const [timeLeft, setTimeLeft] = useState(30);
  const [behavioralData, setBehavioralData] = useState<BehavioralFeatures | null>(null);
  const [behavioralScore, setBehavioralScore] = useState(0);
  const [facialScore, setFacialScore] = useState(0);
  const [advancedMetrics, setAdvancedMetrics] = useState<AdvancedMetrics>(defaultAdvancedMetrics);
  const [emotionProfile, setEmotionProfile] = useState<EmotionProfile>(createEmptyEmotionProfile());
  const [dominantEmotion, setDominantEmotion] = useState('Pending');
  const [faceDetectionRate, setFaceDetectionRate] = useState(0);
  const [analysisNote, setAnalysisNote] = useState('Upload a 10-second face video for Python analysis.');
  const [facialError, setFacialError] = useState<string | null>(null);
  const [framesAnalyzed, setFramesAnalyzed] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const behaviorTracker = useRef(new BehaviorTracker());
  const timerRef = useRef<number | null>(null);

  const combinedScore = behavioralData ? clamp(facialScore * 0.6 + behavioralScore * 0.4) : facialScore;
  const stressLevel = getStressLevel(combinedScore);

  const resetFacialState = () => {
    setFacialScore(0);
    setAdvancedMetrics(defaultAdvancedMetrics);
    setEmotionProfile(createEmptyEmotionProfile());
    setDominantEmotion('Pending');
    setFaceDetectionRate(0);
    setAnalysisNote('Upload a 10-second face video for Python analysis.');
    setFacialError(null);
    setFramesAnalyzed(0);
    setSelectedVideo(null);
    setSelectedVideoUrl(null);
    setIsUploading(false);
  };

  const applyFacialMetrics = (metrics: FacialBackendMetrics) => {
    setFacialScore(metrics.stressScore);
    setAdvancedMetrics({
      darkCircles: metrics.darkCircles,
      dullness: metrics.dullness,
      tensionIndex: metrics.tensionIndex,
      fatigueScore: metrics.fatigueScore,
    });
    setEmotionProfile(metrics.expressions);
    setDominantEmotion(metrics.dominantEmotion);
    setFaceDetectionRate(metrics.faceDetectionRate);
    setAnalysisNote(metrics.note);
    setFramesAnalyzed(metrics.framesAnalyzed);
  };

  const startBehavioral = () => {
    setPhase('behavioral');
    let secondsLeft = 30;
    setTimeLeft(secondsLeft);
    behaviorTracker.current.start();

    timerRef.current = window.setInterval(async () => {
      secondsLeft -= 1;
      setTimeLeft(secondsLeft);

      if (secondsLeft <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        const data = behaviorTracker.current.stop();
        setBehavioralData(data);
        const score = await stressModel.predict(data);
        setBehavioralScore(score);
        startFacialSetup();
      }
    }, 1000);
  };

  const startFacialSetup = () => {
    resetFacialState();
    setPhase('facial');
  };

  const onVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFacialError(null);

    if (!file) {
      setSelectedVideo(null);
      setSelectedVideoUrl(null);
      return;
    }

    setSelectedVideo(file);
    setSelectedVideoUrl(URL.createObjectURL(file));
  };

  const submitVideoForAnalysis = async () => {
    if (!selectedVideo) {
      setFacialError('Select a recorded face video first.');
      return;
    }

    setIsUploading(true);
    setFacialError(null);
    setPhase('analyzing');

    try {
      const metrics = await analyzeFacialVideo(selectedVideo);
      applyFacialMetrics(metrics);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to analyze uploaded video.';
      setFacialError(message);
      setAnalysisNote(message);
      setPhase('facial');
      return;
    } finally {
      setIsUploading(false);
    }

    window.setTimeout(() => setPhase('report'), 600);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (selectedVideoUrl) {
        URL.revokeObjectURL(selectedVideoUrl);
      }
    };
  }, [selectedVideoUrl]);

  const radarData = buildRadarData(facialScore, emotionProfile, advancedMetrics, behavioralData);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-bg/98 backdrop-blur-xl p-4 md:p-8 overflow-y-auto">
      <div className="w-full max-w-5xl my-auto">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 border border-white/10 rounded-[2.5rem] p-12 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-brand-green/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="w-20 h-20 bg-brand-green/20 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
                  <Brain className="text-brand-green" size={40} />
                </div>

                <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-white">Full Cognitive Audit</h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
                  We are about to perform a multi-layered analysis of your mental state.
                  First, we&apos;ll monitor your <span className="text-white font-bold">interaction dynamics</span>,
                  followed by a <span className="text-white font-bold">Python video scan</span> using a short recorded face clip.
                </p>

                <div className="flex flex-col md:flex-row gap-6 justify-center mb-12">
                  <div className="flex items-center gap-4 px-6 py-4 bg-white/5 rounded-2xl border border-white/5">
                    <MousePointer2 className="text-brand-green" />
                    <div className="text-left">
                      <div className="text-xs text-gray-500 font-bold uppercase">Stage 1</div>
                      <div className="text-sm font-bold text-white">Behavioral Audit</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 px-6 py-4 bg-white/5 rounded-2xl border border-white/5">
                    <ScanFace className="text-brand-green" />
                    <div className="text-left">
                      <div className="text-xs text-gray-500 font-bold uppercase">Stage 2</div>
                      <div className="text-sm font-bold text-white">70% Accuracy ML Scan</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={startBehavioral}
                  className="group relative px-12 py-5 bg-brand-green text-dark-bg font-black rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(0,255,136,0.2)]"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative flex items-center gap-3 text-lg">
                    Begin Dual Assessment <ChevronRight size={20} />
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'behavioral' && (
            <motion.div
              key="behavioral"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-12 w-full"
            >
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="text-3xl font-bold flex items-center gap-3 text-white">
                    <MousePointer2 className="text-brand-green" /> Behavioral Interaction
                  </h2>
                  <p className="text-gray-500 mt-1">Analyzing typing and coordination patterns</p>
                </div>
                <div className="px-6 py-3 bg-brand-green/10 rounded-2xl border border-brand-green/20">
                  <span className="text-2xl font-mono font-black text-brand-green">{timeLeft}s</span>
                </div>
              </div>

              <div className="grid gap-8">
                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl text-gray-400 font-serif text-xl leading-relaxed italic select-none">
                  &quot;The mind&apos;s internal state often manifests in the smallest of movements.
                  Fluidity, speed, and rhythm of interaction provide a window into
                  cognitive load and autonomic tension.&quot;
                </div>
                <textarea
                  autoFocus
                  className="w-full h-48 bg-white/5 border border-white/10 rounded-3xl p-8 text-xl text-white focus:outline-none focus:border-brand-green/50 transition-all resize-none placeholder:text-gray-700"
                  placeholder="Type the text above to provide behavioral data..."
                />
              </div>
            </motion.div>
          )}

          {phase === 'facial' && (
            <motion.div
              key="facial"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-12 w-full"
            >
              <div className="flex justify-between items-center mb-8 text-left">
                <div>
                  <h2 className="text-3xl font-bold flex items-center gap-3 text-white">
                    <FileVideo className="text-brand-green" /> Upload Face Video
                  </h2>
                  <p className="text-gray-500 mt-1">Record a steady 10-second face video on your phone or laptop, then upload it here for Python analysis.</p>
                </div>
                <div className="px-6 py-3 bg-brand-green/10 rounded-2xl border border-brand-green/20">
                  <span className="text-sm font-black text-brand-green uppercase tracking-widest">10s Clip</span>
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
                  <label className="group flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-white/15 bg-black/20 px-6 text-center transition-colors hover:border-brand-green/40 hover:bg-black/25">
                    <Upload className="mb-4 text-brand-green" size={34} />
                    <div className="text-xl font-bold text-white mb-2">Choose a 10-second face video</div>
                    <p className="max-w-md text-sm text-gray-400 leading-relaxed">
                      Look straight into the camera, keep the room well lit, and avoid heavy movement. `mp4`, `mov`, and similar video formats are fine.
                    </p>
                    <input type="file" accept="video/*" className="hidden" onChange={onVideoSelect} />
                  </label>

                  {selectedVideo && (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-300">
                      Selected: <span className="font-semibold text-white">{selectedVideo.name}</span>
                    </div>
                  )}

                  {selectedVideoUrl && (
                    <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black">
                      <video src={selectedVideoUrl} controls className="aspect-video w-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Before upload</div>
                    <div className="space-y-3 text-sm text-gray-300">
                      <p>Keep your full face visible.</p>
                      <p>Use about 10 seconds of steady recording.</p>
                      <p>Do not crop too tightly around the eyes only.</p>
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">What Python checks</div>
                    <div className="space-y-3 text-sm text-gray-300">
                      <p>Expression patterns across sampled frames</p>
                      <p>Under-eye darkness and fatigue score</p>
                      <p>Facial dullness and tension index</p>
                    </div>
                  </div>

                  <button
                    onClick={() => void submitVideoForAnalysis()}
                    disabled={!selectedVideo || isUploading}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-green px-6 py-4 font-black text-dark-bg transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploading ? <LoaderCircle className="animate-spin" size={20} /> : <Camera size={20} />}
                    {isUploading ? 'Analyzing Upload...' : 'Analyze 10s Video'}
                  </button>

                  {facialError && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {facialError}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'analyzing' && (
            <motion.div key="analyzing" className="text-center py-20 w-full">
              <div className="relative w-32 h-32 mx-auto mb-12">
                <motion.div
                  className="absolute inset-0 border-4 border-brand-green/20 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 border-t-4 border-brand-green rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <BarChart3 className="text-brand-green" size={40} />
                </div>
              </div>
              <h2 className="text-4xl font-black mb-4 text-white">Curating Your Report</h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Processing the uploaded video in Python and merging it with behavioral telemetry...
              </p>
            </motion.div>
          )}

          {phase === 'report' && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-[3rem] p-8 md:p-16 relative overflow-hidden w-full"
            >
              <div className="absolute top-0 right-0 p-8">
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                  <X size={32} />
                </button>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green/10 rounded-full text-brand-green text-xs font-black uppercase tracking-widest mb-4">
                    Clinical Audit Result
                  </div>
                  <h1 className="text-5xl font-black mb-4 text-white">Mental Performance <br />Report</h1>
                  <p className="text-gray-500 flex items-center gap-2">
                    <User size={16} /> Patient Assessment ID: #STRESS-2026-0513
                  </p>
                  <p className="mt-4 max-w-2xl text-sm text-gray-400 leading-relaxed">{analysisNote}</p>
                </div>

                <div className="text-center p-8 bg-white/5 border border-white/10 rounded-[2rem] min-w-[240px]">
                  <div className="text-xs text-gray-500 uppercase font-black mb-2">Overall Stress Index</div>
                  <div className={`text-7xl font-black ${stressLevel.color}`}>
                    {Math.round(combinedScore * 100)}%
                  </div>
                  <div className={`mt-4 px-4 py-1.5 rounded-full text-sm font-bold ${stressLevel.bg} ${stressLevel.color}`}>
                    {stressLevel.label} Stress Detected
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-4 mb-10">
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-xs text-gray-500 uppercase font-bold">Dominant Expression</div>
                    <ScanFace size={16} className="text-brand-green" />
                  </div>
                  <div className="text-3xl font-black mb-2 text-white">{dominantEmotion}</div>
                  <div className="text-[10px] text-gray-400">Most frequent expression across sampled frames</div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-xs text-gray-500 uppercase font-bold">Frames Analyzed</div>
                    <FileVideo size={16} className="text-brand-green" />
                  </div>
                  <div className="text-3xl font-black mb-2 text-white">{framesAnalyzed}</div>
                  <div className="text-[10px] text-gray-400">Sampled frames from the uploaded clip</div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-xs text-gray-500 uppercase font-bold">Face Detection Rate</div>
                    <CheckCircle2 size={16} className="text-brand-green" />
                  </div>
                  <div className="text-3xl font-black mb-2 text-white">{Math.round(faceDetectionRate * 100)}%</div>
                  <div className="text-[10px] text-gray-400">How often the backend could lock onto a face</div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-xs text-gray-500 uppercase font-bold">Behavioral Load</div>
                    <MousePointer2 size={16} className="text-brand-green" />
                  </div>
                  <div className="text-3xl font-black mb-2 text-white">{Math.round(behavioralScore * 100)}%</div>
                  <div className="text-[10px] text-gray-400">Typing pace, mouse jitter, speed, and click rate</div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8 mb-16">
                <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem]">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-white">
                    <TrendingUp className="text-brand-green" size={20} /> Emotion Distribution
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#333" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 12 }} />
                        <Radar name="State" dataKey="A" stroke="#00FF88" fill="#00FF88" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem]">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-white">
                    <MousePointer2 className="text-brand-green" size={20} /> Interaction Telemetry
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Speed', val: behavioralData?.mouseSpeed || 0 },
                        { name: 'Jitter', val: (behavioralData?.mouseJitter || 0) * 2 },
                        { name: 'Typing', val: (behavioralData?.typingSpeed || 0) * 2 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis dataKey="name" stroke="#666" />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                          itemStyle={{ color: '#00FF88' }}
                        />
                        <Bar dataKey="val" fill="#00FF88" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-16">
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-xs text-gray-500 uppercase font-bold">Ocular Fatigue</div>
                    <AlertCircle size={16} className={advancedMetrics.darkCircles > 50 ? 'text-yellow-500' : 'text-gray-700'} />
                  </div>
                  <div className="text-3xl font-black mb-2 text-white">{Math.round(advancedMetrics.darkCircles)}%</div>
                  <div className="text-[10px] text-gray-400">Average under-eye darkness across the clip</div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-xs text-gray-500 uppercase font-bold">Dermal Dullness</div>
                    <CheckCircle2 size={16} className="text-brand-green" />
                  </div>
                  <div className="text-3xl font-black mb-2 text-white">{Math.round(advancedMetrics.dullness)}%</div>
                  <div className="text-[10px] text-gray-400">Brightness and texture dullness from the face region</div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-xs text-gray-500 uppercase font-bold">Tension Index</div>
                    <TrendingUp size={16} className="text-brand-green" />
                  </div>
                  <div className="text-3xl font-black mb-2 text-white">{advancedMetrics.tensionIndex.toFixed(2)}</div>
                  <div className="text-[10px] text-gray-400">Face geometry ratio averaged across detected frames</div>
                </div>
              </div>

              <div className="bg-brand-green/5 border border-brand-green/20 rounded-3xl p-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                  <CheckCircle2 className="text-brand-green" /> Curated Recommendations
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4 text-left">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center shrink-0 text-brand-green font-bold">1</div>
                      <p className="text-sm text-gray-300">
                        {advancedMetrics.darkCircles > 55
                          ? 'The clip shows strong under-eye fatigue markers. Prioritize hydration and a short visual break away from screens.'
                          : 'Under-eye fatigue stayed moderate. Keep regular visual breaks to prevent escalation later in the day.'}
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center shrink-0 text-brand-green font-bold">2</div>
                      <p className="text-sm text-gray-300">
                        {combinedScore > 0.6
                          ? 'Your combined telemetry points to elevated stress. Use 5 minutes of box breathing before the next focused work block.'
                          : 'Your combined telemetry stayed controlled. A short reset walk can help maintain this baseline.'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4 text-left">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center shrink-0 text-brand-green font-bold">3</div>
                      <p className="text-sm text-gray-300">
                        Dominant expression during the clip was <span className="text-white font-semibold">{dominantEmotion}</span>. Review whether the task or mood during recording matched that emotional load.
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center shrink-0 text-brand-green font-bold">4</div>
                      <p className="text-sm text-gray-300">
                        {faceDetectionRate < 0.6
                          ? 'The video framing or lighting made the face harder to track. Keep the camera steadier and your face centered for the next clip.'
                          : 'The uploaded clip gave stable facial visibility. Future uploads will be comparable against this one.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 text-center">
                <button
                  onClick={onClose}
                  className="px-12 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
