import React from 'react';
import { useState, useRef, useEffect, useCallback } from "react";
import { signInWithGoogle, signUpWithEmail, signInWithEmail } from './auth';

// ─── Constants ───────────────────────────────────────────────────────────────
const GRADE_OPTIONS = [
  { value: '9', label: '9th Grade (Freshman)' },
  { value: '10', label: '10th Grade (Sophomore)' },
  { value: '11', label: '11th Grade (Junior)' },
  { value: '12', label: '12th Grade (Senior)' },
  { value: 'prefer_not', label: 'Prefer Not to Say' },
];
const LANGUAGES = [
  { code: 'auto', label: 'Auto-detect' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'zh', label: '中文' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'tl', label: 'Filipino' },
];
const QUICK_TOPICS = [
  { icon: '📝', label: 'SAT Prep', prompt: "What's the best way to prepare for the SAT? Give me a full study plan." },
  { icon: '🎓', label: 'ACT Tips', prompt: 'How should I prepare for the ACT? What sections should I focus on?' },
  { icon: '📚', label: 'Study Methods', prompt: 'What are the most effective study methods for high school students?' },
  { icon: '🏫', label: 'College Prep', prompt: 'What should I be doing in high school to prepare for college?' },
  { icon: '✏️', label: 'Essay Help', prompt: 'How do I write a strong college application essay?' },
  { icon: '🔬', label: 'AP Exams', prompt: 'How do I prepare for AP exams? Which ones are worth taking?' },
  { icon: '💼', label: 'Extracurriculars', prompt: 'What extracurricular activities look best for college applications?' },
  { icon: '🧮', label: 'Math Help', prompt: "I'm struggling with high school math. What resources can help me?" },
  { icon: '💻', label: 'Coding Intro', prompt: 'I want to learn coding as a high schooler. Where should I start and what languages should I learn?' },
  { icon: '🧬', label: 'Science Help', prompt: 'Help me understand key science concepts for high school biology, chemistry, and physics.' },
];
const CODING_LANGS = ['Python', 'JavaScript', 'HTML/CSS', 'Java', 'C++', 'SQL', 'Scratch', 'TypeScript', 'React', 'Swift'];
const SYSTEM_PROMPT = `You are ApexHighAI, a friendly, knowledgeable, and highly encouraging AI assistant built to help high school students across the United States.

LANGUAGE RULE: Always respond in the same language the student uses, or their selected language. Be fully fluent in all languages.

IMAGE RULE: Analyze images carefully — solve homework problems, summarize notes, give essay feedback, explain diagrams.

PDF/FILE RULE: Read and analyze documents thoroughly. Help summarize, explain, or answer questions from them.

VIDEO RULE: Extract all educational content from videos — answer questions shown, explain concepts, summarize lessons.

CODING RULE: When helping with code, always provide clean, well-commented code with explanations. Format code in proper code blocks. Explain what each part does in student-friendly terms. Support all programming languages.

PROJECT RULE: When a student shares a project, help them plan, structure, improve, or debug it. Be encouraging and give actionable feedback.

IMAGE GENERATION: When asked to create/generate an image, describe it vividly and in detail.

Knowledge: SAT (400-1600), ACT (1-36), PSAT, AP Exams, IB, CLEP, study methods, college prep, essays, FAFSA, extracurriculars, all core subjects, programming, computer science.

Tone: Warm, motivating, clear, student-friendly. Use structure, bullet points, and headers. Always encourage.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(text) {
  if (!text) return '';
  text = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) => {
    const l = lang || '';
    return `<div class="code-block"><div class="code-header"><span class="code-lang">${l}</span><button class="copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('code').innerText)">Copy</button></div><pre><code class="lang-${l}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre></div>`;
  });
  text = text.replace(/`([^`]+)`/g, "<code class='inline-code'>$1</code>");
  text = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h4>$1</h4>')
    .replace(/^## (.*$)/gm, '<h3>$1</h3>')
    .replace(/^# (.*$)/gm, '<h2>$1</h2>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
  return text;
}
function toB64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = () => rej();
    r.readAsDataURL(file);
  });
}
function isImg(f) { return f.type.startsWith('image/'); }
function isPDF(f) { return f.type === 'application/pdf'; }
function isVid(f) { return f.type.startsWith('video/'); }
function mtype(f) {
  const m = { 'application/pdf': 'application/pdf', 'image/jpeg': 'image/jpeg', 'image/png': 'image/png', 'image/gif': 'image/gif', 'image/webp': 'image/webp' };
  return m[f.type] || 'application/octet-stream';
}
function vidThumb(file) {
  return new Promise((res) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.src = url; v.muted = true; v.currentTime = 1;
    v.onloadeddata = () => {
      const c = document.createElement('canvas');
      c.width = v.videoWidth || 320; c.height = v.videoHeight || 180;
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.7));
    };
    v.onerror = () => { URL.revokeObjectURL(url); res(null); };
  });
}
function uid() { return Math.random().toString(36).slice(2, 9); }
function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return 'just now';
  if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
  return Math.floor(d / 86400000) + 'd ago';
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Dots() {
  return <div className="dots"><span /><span /><span /></div>;
}

function AttachPrev({ atts, onRm }) {
  if (!atts.length) return null;
  return (
    <div className="att-row">
      {atts.map((a, i) => (
        <div key={i} className="att-item">
          {a.isImage && <img src={a.dataUrl} alt={a.name} />}
          {a.isPDF && <div className="att-icon pdf">PDF</div>}
          {a.isVideo && a.thumb ? (
            <div className="att-vw"><img src={a.thumb} alt="" /><div className="play-b">▶</div></div>
          ) : a.isVideo ? <div className="att-icon vid">VID</div> : null}
          {!a.isImage && !a.isPDF && !a.isVideo && <div className="att-icon">{a.ext}</div>}
          <button className="att-rm" onClick={() => onRm(i)}>×</button>
          <span className="att-lbl">{a.name.length > 13 ? a.name.slice(0, 11) + '…' : a.name}</span>
        </div>
      ))}
    </div>
  );
}

function MsgBubble({ msg }) {
  const isU = msg.role === 'user';
  return (
    <div className={`mrow ${isU ? 'urow' : 'arow'}`}>
      {!isU && <div className="av aav">S</div>}
      <div className={`bub ${isU ? 'ubub' : 'abub'}`}>
        {msg.isVoice && <div className="vtag">🎙 Voice message</div>}
        {msg.isCoding && <div className="ctag">💻 Code request</div>}
        {msg.images?.length > 0 && (
          <div className="mimg-row">{msg.images.map((s, i) => <img key={i} src={s} alt="" className="mimg" />)}</div>
        )}
        {msg.videos?.length > 0 && (
          <div className="mimg-row">{msg.videos.map((v, i) => (
            <div key={i} className="mvid">{v.thumb && <img src={v.thumb} alt="" />}<span>🎬 {v.name}</span></div>
          ))}</div>
        )}
        {msg.pdfs?.length > 0 && <div className="mfile-row">{msg.pdfs.map((p, i) => <div key={i} className="mfile">📄 {p}</div>)}</div>}
        {msg.files?.length > 0 && <div className="mfile-row">{msg.files.map((f, i) => <div key={i} className="mfile">📎 {f}</div>)}</div>}
        {msg.content && <div className="bcon" dangerouslySetInnerHTML={{ __html: fmt(msg.content) }} />}
      </div>
      {isU && <div className="av uav">✦</div>}
    </div>
  );
}

// ─── ABOUT US PAGE ────────────────────────────────────────────────────────────
function AboutUs({ onBack }) {
  const features = [
    { icon: '📝', title: 'SAT & ACT Prep', desc: 'Personalized study plans, practice strategies, and section-by-section breakdowns to maximize your score.' },
    { icon: '🏫', title: 'College Planning', desc: 'From building your college list to writing standout essays and understanding financial aid — we guide you every step.' },
    { icon: '💻', title: 'Coding Help', desc: 'Learn any programming language with step-by-step guidance. Debug code, build projects, and grow your CS skills.' },
    { icon: '📸', title: 'Photo & Image Analysis', desc: 'Snap a photo of your homework, notes, or diagrams and get instant explanations and solutions.' },
    { icon: '📄', title: 'PDF & File Support', desc: 'Upload textbooks, study guides, or assignments — ApexHighAI reads and helps you understand any document.' },
    { icon: '🎬', title: 'Video Learning', desc: 'Upload educational videos and get summaries, answers to questions shown, and concept breakdowns.' },
    { icon: '📁', title: 'Project Management', desc: 'Organize your work into projects. Keep your research, essays, and code in one focused workspace.' },
    { icon: '🌐', title: 'Every Language', desc: 'ApexHighAI responds fluently in any language — Spanish, Mandarin, French, Hindi, Arabic, and more.' },
    { icon: '🎙', title: 'Voice Messages', desc: "Can't type? Send a voice message and get a full AI response right away." },
    { icon: '🧮', title: 'All Subjects', desc: 'Math, science, history, English, foreign languages — ask anything and get clear, grade-appropriate answers.' },
  ];
  return (
    <div className="about-page">
      <div className="ab-orb1" /><div className="ab-orb2" /><div className="ab-orb3" />
      <div className="ab-wrap">
        <button className="ab-back" onClick={onBack}>← Back</button>
        <div className="ab-hero">
          <div className="ab-logo-row">
            <div className="ab-logo-ic">🎓</div>
            <span className="ab-logo-tx">ApexHighAI</span>
          </div>
          <div className="ab-badge">High School AI · US Edition</div>
          <h1 className="ab-h1">Built for every high schooler.<br />Ready for anything.</h1>
          <p className="ab-lead">
            ApexHighAI is a free AI-powered study partner designed specifically for US high school students.
            Whether you're prepping for the SAT, struggling with chemistry, writing your college essay, or just
            starting to learn to code — we've got you, in any language, at any level.
          </p>
        </div>

        <div className="ab-mission">
          <h2 className="ab-section-h">Our Mission</h2>
          <p className="ab-section-p">
            Every student deserves access to a brilliant, patient, always-available tutor — regardless of where
            they live, what school they go to, or what language they speak. ApexHighAI levels the playing field,
            giving every high schooler the tools that used to be reserved for students with expensive tutors or
            the most resource-rich schools.
          </p>
          <p className="ab-section-p">
            We believe that with the right support, every student can achieve more than they thought possible.
            ApexHighAI doesn't just answer your questions — it teaches you how to think, plan, and succeed.
          </p>
        </div>

        <div className="ab-features-section">
          <h2 className="ab-section-h">Everything You Need</h2>
          <div className="ab-grid">
            {features.map((f) => (
              <div key={f.title} className="ab-card">
                <div className="ab-card-icon">{f.icon}</div>
                <div className="ab-card-body">
                  <h3 className="ab-card-title">{f.title}</h3>
                  <p className="ab-card-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ab-who">
          <h2 className="ab-section-h">Who It's For</h2>
          <div className="ab-who-grid">
            {[
              { icon: '🧑‍🎓', label: 'Freshmen', desc: 'Start high school strong with the right habits.' },
              { icon: '📈', label: 'Sophomores', desc: 'Build your skills and explore what you love.' },
              { icon: '🎯', label: 'Juniors', desc: 'Tackle standardized tests and early college prep.' },
              { icon: '🏆', label: 'Seniors', desc: 'Nail your applications, essays, and final year.' },
            ].map((w) => (
              <div key={w.label} className="ab-who-card">
                <div className="ab-who-icon">{w.icon}</div>
                <div className="ab-who-label">{w.label}</div>
                <div className="ab-who-desc">{w.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ab-cta">
          <h2 className="ab-cta-h">Ready to reach your apex?</h2>
          <p className="ab-cta-sub">Join thousands of students already using ApexHighAI to study smarter, score higher, and plan their futures.</p>
          <button className="ab-cta-btn" onClick={onBack}>Get Started →</button>
        </div>

        <div className="ab-trust">
          <span>🔒 Private</span><span className="td" />
          <span>📷 Photos</span><span className="td" />
          <span>📄 PDFs</span><span className="td" />
          <span>🎬 Videos</span><span className="td" />
          <span>💻 Coding</span><span className="td" />
          <span>🌐 All Languages</span><span className="td" />
          <span>✨ Always Free to Try</span>
        </div>
      </div>
    </div>
  );
}

// ─── HOME PAGE (was Landing) ──────────────────────────────────────────────────
// This is now the FIRST page visitors see — the main welcome screen.
// It shows: Welcome text, quick topics, a Log In button (top right),
// a "Choose Your Grade" button (top center), and an "About Us" link.
function HomePage({ onGoGrade, onGoLogin, onGoAbout, onGoChat }) {
  const [showLangM, setShowLangM] = useState(false);
  const [lang, setLang] = useState('auto');

  return (
    <div className="home-page">
      <div className="hp-orb1" /><div className="hp-orb2" /><div className="hp-orb3" />

      {/* Top bar */}
      <div className="hp-topbar">
        <div className="hp-logo">
          <div className="hp-logo-ic">🎓</div>
          <span className="hp-logo-tx">ApexHighAI</span>
        </div>

        {/* Center: Grade selector button */}
        <div className="hp-top-center">
          <button className="hp-grade-btn" onClick={onGoGrade}>
            📚 Choose Your Grade
          </button>
        </div>

        {/* Right: Language + Login */}
        <div className="hp-top-right">
          <div style={{ position: 'relative' }}>
            <button className="hp-lang-btn" onClick={() => setShowLangM(v => !v)}>
              🌐 {LANGUAGES.find(l => l.code === lang)?.label}
            </button>
            {showLangM && (
              <div className="hp-lang-dd">
                {LANGUAGES.map(l => (
                  <div key={l.code} className={`lopt${lang === l.code ? ' act' : ''}`}
                    onClick={() => { setLang(l.code); setShowLangM(false); }}>
                    {l.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="hp-login-btn" onClick={onGoLogin}>Log In</button>
        </div>
      </div>

      {/* Hero */}
      <div className="hp-hero">
        <div className="hp-badge">High School AI · US Edition</div>
        <h1 className="hp-h1">Welcome</h1>
        <p className="hp-sub">
          Hey there! 👋 I'm <strong>ApexHighAI</strong> — your personal high school AI. You can
          chat, drop files, take photos, upload videos, write code, or manage projects.{' '}
          <em>I respond in any language!</em>
        </p>
        <button className="hp-about-btn" onClick={onGoAbout}>About Us</button>
      </div>

      {/* Quick topics */}
      <div className="hp-topics-wrap">
        <div className="hp-topics-lbl">Quick Topics</div>
        <div className="hp-topics-row">
          {QUICK_TOPICS.map(t => (
            <button key={t.label} className="hp-topic-chip" onClick={() => onGoChat(t.prompt)}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ask anything bar (visual, prompts login/grade first) */}
      <div className="hp-input-area">
        <div className="hp-iinner" onClick={onGoGrade}>
          <span className="hp-input-placeholder">Ask anything… or drop a file, photo, PDF, or video</span>
          <button className="hp-send-btn">↑</button>
        </div>
        <p className="hp-disc">ApexHighAI · AI-powered · All languages supported · Always verify important info with your school</p>
      </div>
    </div>
  );
}

// ─── LOGIN / AUTH ─────────────────────────────────────────────────────────────
function LoginPage({ onContinue, onBack }) {
  const [mode, setMode] = useState('home');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const googleAuth = async () => {
    try {
      setAuthLoading(true); setErr('');
      const user = await signInWithGoogle();
      onContinue({ provider: 'google', name: user.displayName || user.email, isGuest: false, uid: user.uid });
    } catch (e) { setErr(e.message); } finally { setAuthLoading(false); }
  };

  const emailAuth = async () => {
    if (!email.includes('@')) { setErr('Enter a valid email.'); return; }
    if (pass.length < 6) { setErr('Password needs 6+ chars.'); return; }
    try {
      setAuthLoading(true); setErr('');
      let user;
      if (mode === 'signup') { user = await signUpWithEmail(email, pass); }
      else { user = await signInWithEmail(email, pass); }
      onContinue({ provider: 'email', name: user.displayName || email, isGuest: false, uid: user.uid });
    } catch (e) {
      setErr(
        e.message.includes('user-not-found') ? 'No account found. Sign up instead.' :
        e.message.includes('wrong-password') ? 'Incorrect password.' :
        e.message.includes('email-already') ? 'Account exists. Sign in instead.' : e.message
      );
    } finally { setAuthLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="lo1" /><div className="lo2" /><div className="lo3" />
      <div className="land-card">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="land-logo">
          <div className="land-icon">🎓</div>
          <span className="land-title">ApexHighAI</span>
        </div>
        <div className="land-badge">High School AI · US Edition</div>

        {mode === 'home' && (
          <>
            <h1 className="land-h">Sign in to your account</h1>
            <p className="land-sub">Save your chats, projects, and preferences across sessions.</p>
            <div className="auth-btns">
              <button className="auth-btn google" onClick={googleAuth} disabled={authLoading}>
                <span className="aico g">G</span>
                {authLoading ? 'Signing in…' : 'Continue with Google'}
              </button>
              <button className="auth-btn email-b" onClick={() => { setMode('signin'); setErr(''); }} disabled={authLoading}>
                <span className="aico">✉️</span> Continue with Email
              </button>
            </div>
            <div className="divider"><span>or</span></div>
            <button className="guest-btn" onClick={() => onContinue({ provider: 'guest', name: 'Guest', isGuest: true })}>
              Continue as Guest →
            </button>
            <p className="guest-note">No account needed · Guest sessions are temporary</p>
          </>
        )}

        {(mode === 'signin' || mode === 'signup') && (
          <>
            <button className="back-btn" onClick={() => { setMode('home'); setErr(''); }}>← Back</button>
            <h2 className="land-h2">{mode === 'signin' ? 'Sign In' : 'Create Account'}</h2>
            {err && <p className="auth-err">⚠ {err}</p>}
            {mode === 'signup' && (
              <input className="auth-input" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            )}
            <input className="auth-input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="auth-input" type="password" placeholder={mode === 'signup' ? 'Create password (6+ chars)' : 'Password'} value={pass} onChange={e => setPass(e.target.value)} />
            <button className="auth-submit" onClick={emailAuth} disabled={authLoading}>
              {authLoading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
            <p className="auth-switch">
              {mode === 'signin' ? 'No account? ' : 'Have an account? '}
              <span onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </span>
            </p>
          </>
        )}

        <div className="land-trust">
          <span>🔒 Private</span><span className="td" />
          <span>📷 Photos</span><span className="td" />
          <span>📄 PDFs</span><span className="td" />
          <span>🎬 Videos</span><span className="td" />
          <span>💻 Coding</span><span className="td" />
          <span>🌐 All Languages</span>
        </div>
      </div>
    </div>
  );
}

// ─── GRADE SELECTOR (was Onboarding) ─────────────────────────────────────────
function GradeSelector({ user, onStart, onBack }) {
  const [grade, setGrade] = useState('');
  const [gradeErr, setGradeErr] = useState(false);
  const [lang, setLang] = useState('auto');
  const [showL, setShowL] = useState(false);
  const go = () => {
    if (!grade) { setGradeErr(true); return; }
    onStart({ grade, lang });
  };
  return (
    <div className="onboarding">
      <div className="bo1" /><div className="bo2" /><div className="bo3" />
      <div className="ob-card">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="logo-lk">
          <div className="logo-ic">🎓</div>
          <span className="logo-tx">ApexHighAI</span>
        </div>
        <div className="logo-tag">High School AI Assistant · US Edition</div>
        {user && (
          <p className="wname" style={{ color: user.isGuest ? '#8899bb' : '#2dd4bf' }}>
            {user.isGuest ? 'Continuing as Guest 👋' : `Welcome, ${user.name || 'Scholar'}! 👋`}
          </p>
        )}
        <h1 className="ob-h">What grade are you in?</h1>
        <p className="ob-sub">We'll personalize your experience — SAT prep, college advice, and more tailored just for you.</p>
        <div className="gg">
          {GRADE_OPTIONS.slice(0, 4).map(o => (
            <button key={o.value} className={`gbtn${grade === o.value ? ' sel' : ''}`}
              onClick={() => { setGrade(o.value); setGradeErr(false); }}>
              {o.label}
            </button>
          ))}
          <button className={`gbtn prefer${grade === 'prefer_not' ? ' sel' : ''}`}
            onClick={() => { setGrade('prefer_not'); setGradeErr(false); }}>
            🔒 Prefer Not to Say
          </button>
        </div>
        {gradeErr && <p className="err-m">⚠ Please select your grade.</p>}
        <label className="flbl">Preferred language</label>
        <div className="lw">
          <button className="lbtn" onClick={() => setShowL(v => !v)}>
            <span>{LANGUAGES.find(l => l.code === lang)?.label}</span>
            <span style={{ opacity: 0.5 }}>▾</span>
          </button>
          {showL && (
            <div className="ldrop">
              {LANGUAGES.map(l => (
                <div key={l.code} className={`lopt${lang === l.code ? ' act' : ''}`}
                  onClick={() => { setLang(l.code); setShowL(false); }}>
                  {l.label}
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="s-btn" onClick={go}>Start Using ApexHighAI →</button>
        <div className="t-strip">
          <span>🔒 Private</span><span className="td" />
          <span>💻 Coding</span><span className="td" />
          <span>📁 Projects</span><span className="td" />
          <span>🎬 Videos</span><span className="td" />
          <span>🌐 All Languages</span>
        </div>
      </div>
    </div>
  );
}

// ─── CODING PANEL ─────────────────────────────────────────────────────────────
function CodingPanel({ onSendPrompt, onClose }) {
  const [selLang, setSelLang] = useState('Python');
  const [codeTask, setCodeTask] = useState('');
  const go = () => {
    if (!codeTask.trim()) return;
    onSendPrompt(`[CODING REQUEST — ${selLang}]\n${codeTask}`);
    setCodeTask(''); onClose();
  };
  return (
    <div className="cp-overlay" onClick={e => { if (e.target.className === 'cp-overlay') onClose(); }}>
      <div className="cp-modal">
        <div className="cp-hdr">
          <span className="cp-title">💻 Coding Assistant</span>
          <button className="cp-cls" onClick={onClose}>✕</button>
        </div>
        <p className="cp-sub">Pick a language and describe what you want to build or learn.</p>
        <div className="cp-langs">
          {CODING_LANGS.map(l => (
            <button key={l} className={`cp-lang${selLang === l ? ' sel' : ''}`} onClick={() => setSelLang(l)}>{l}</button>
          ))}
        </div>
        <textarea className="cp-ta"
          placeholder={`Describe your ${selLang} task…\n\nExamples:\n• Write a function that calculates GPA\n• Explain what a for loop with an example\n• Help me build a simple calculator\n• Debug this code: [paste code here]`}
          value={codeTask} onChange={e => setCodeTask(e.target.value)} rows={5} />
        <div className="cp-actions">
          <button className="cp-cancel" onClick={onClose}>Cancel</button>
          <button className="cp-go" onClick={go} disabled={!codeTask.trim()}>Ask ApexHighAI →</button>
        </div>
      </div>
    </div>
  );
}

// ─── PROJECT PANEL ────────────────────────────────────────────────────────────
function ProjectPanel({ projects, onNew, onSelect, onDelete, selectedId, onClose }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [adding, setAdding] = useState(false);
  const create = () => {
    if (!name.trim()) return;
    onNew({ id: uid(), name: name.trim(), desc: desc.trim(), created: Date.now(), chats: [] });
    setName(''); setDesc(''); setAdding(false);
  };
  return (
    <div className="pj-panel">
      <div className="pj-hdr">
        <span className="pj-title">📁 Projects</span>
        <button className="pj-cls" onClick={onClose}>✕</button>
      </div>
      {!adding && <button className="pj-new" onClick={() => setAdding(true)}>＋ New Project</button>}
      {adding && (
        <div className="pj-form">
          <input className="pj-inp" placeholder="Project name" value={name} onChange={e => setName(e.target.value)} />
          <input className="pj-inp" placeholder="Short description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
          <div className="pj-fa">
            <button className="pj-cancel" onClick={() => setAdding(false)}>Cancel</button>
            <button className="pj-create" onClick={create} disabled={!name.trim()}>Create</button>
          </div>
        </div>
      )}
      <div className="pj-list">
        {projects.length === 0 && <p className="pj-empty">No projects yet. Create one to organize your work!</p>}
        {projects.map(p => (
          <div key={p.id} className={`pj-item${p.id === selectedId ? ' pj-sel' : ''}`} onClick={() => onSelect(p.id)}>
            <div className="pj-item-icon">📁</div>
            <div className="pj-item-info">
              <span className="pj-item-name">{p.name}</span>
              {p.desc && <span className="pj-item-desc">{p.desc}</span>}
              <span className="pj-item-ts">{timeAgo(p.created)}</span>
            </div>
            <button className="pj-del" onClick={e => { e.stopPropagation(); onDelete(p.id); }}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ApexHighAI() {
  // screen: 'home' | 'login' | 'grade' | 'about' | 'chat'
  const [screen, setScreen] = useState('home');
  const [user, setUser] = useState(null);
  const [grade, setGrade] = useState('');
  const [lang, setLang] = useState('auto');
  const [chats, setChats] = useState([]);
  const [activeCid, setActiveCid] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProj, setActiveProj] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [atts, setAtts] = useState([]);
  const [isDrag, setIsDrag] = useState(false);
  const [isRec, setIsRec] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [showCam, setShowCam] = useState(false);
  const [camStream, setCamStream] = useState(null);
  const [camPhotos, setCamPhotos] = useState([]);
  const [vidStatus, setVidStatus] = useState('');
  const [sideOpen, setSideOpen] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const [showProj, setShowProj] = useState(false);
  const [showLangM, setShowLangM] = useState(false);
  // Stores a prompt to auto-send when entering the chat after clicking a quick topic from home
  const [pendingPrompt, setPendingPrompt] = useState(null);

  const chatEnd = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const pdfRef = useRef(null);
  const vidRef = useRef(null);
  const camRef = useRef(null);
  const recRef = useRef(null);
  const recTimer = useRef(null);
  const recChunk = useRef([]);

  const activeChat = chats.find(c => c.id === activeCid) || null;
  const msgs = activeChat?.msgs || [];

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const sysP = useCallback(() => {
    const lNote = lang !== 'auto' ? `\n\nLANGUAGE OVERRIDE: Always respond ONLY in "${LANGUAGES.find(l => l.code === lang)?.label}".` : '';
    const gNote = grade && grade !== 'prefer_not' ? `\n\nStudent is in ${GRADE_OPTIONS.find(o => o.value === grade)?.label}. Tailor advice.` : '';
    const pNote = activeProj ? `\n\nStudent is working on project: "${projects.find(p => p.id === activeProj)?.name || ''}". Keep context related to this project when relevant.` : '';
    return SYSTEM_PROMPT + lNote + gNote + pNote;
  }, [lang, grade, activeProj, projects]);

  const newChat = (projId = null, initialMsg = null) => {
    const id = uid();
    const chat = { id, title: 'New Chat', msgs: [], projectId: projId, ts: Date.now() };
    setChats(prev => [chat, ...prev]);
    setActiveCid(id);
    if (projId) setActiveProj(projId);
    if (initialMsg) { setTimeout(() => sendWithId(id, [], initialMsg), 100); }
    return id;
  };

  const updateChatMsgs = (cid, updater) => {
    setChats(prev => prev.map(c => c.id === cid ? { ...c, msgs: updater(c.msgs) } : c));
  };

  const renameChat = (cid, firstMsg) => {
    const title = firstMsg.slice(0, 40) + (firstMsg.length > 40 ? '…' : '');
    setChats(prev => prev.map(c => c.id === cid ? { ...c, title } : c));
  };

  const processFiles = useCallback(async (files) => {
    const res = [];
    for (const f of files) {
      const b64 = await toB64(f);
      const ext = f.name.split('.').pop().toUpperCase().slice(0, 4);
      let thumb = null;
      if (isVid(f)) { setVidStatus('🎬 Processing video…'); thumb = await vidThumb(f); setVidStatus(''); }
      res.push({ name: f.name, ext, isImage: isImg(f), isPDF: isPDF(f), isVideo: isVid(f), dataUrl: isImg(f) ? `data:${f.type};base64,${b64}` : null, thumb, base64: b64, mediaType: mtype(f) });
    }
    setAtts(prev => [...prev, ...res]);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDrag(false); processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  const openCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setCamStream(s); setShowCam(true);
    } catch { alert('Camera access denied.'); }
  };
  useEffect(() => {
    if (showCam && camRef.current && camStream) { camRef.current.srcObject = camStream; camRef.current.play(); }
  }, [showCam, camStream]);
  const snap = () => {
    const c = document.createElement('canvas');
    c.width = camRef.current.videoWidth; c.height = camRef.current.videoHeight;
    c.getContext('2d').drawImage(camRef.current, 0, 0);
    setCamPhotos(prev => [...prev, c.toDataURL('image/jpeg', 0.85)]);
  };
  const closeCam = () => { camStream?.getTracks().forEach(t => t.stop()); setCamStream(null); setShowCam(false); };
  const useCamPhotos = () => {
    setAtts(prev => [...prev, ...camPhotos.map((d, i) => ({ name: `photo_${i + 1}.jpg`, ext: 'JPG', isImage: true, isPDF: false, isVideo: false, dataUrl: d, base64: d.split(',')[1], mediaType: 'image/jpeg' }))]);
    setCamPhotos([]); closeCam();
  };

  const startRec = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      recChunk.current = [];
      const mr = new MediaRecorder(s);
      mr.ondataavailable = e => recChunk.current.push(e.data);
      mr.onstop = () => { s.getTracks().forEach(t => t.stop()); sendVoice(); };
      mr.start(); recRef.current = mr; setIsRec(true); setRecSec(0);
      recTimer.current = setInterval(() => setRecSec(s => s + 1), 1000);
    } catch { alert('Mic access denied.'); }
  };
  const stopRec = () => { recRef.current?.stop(); clearInterval(recTimer.current); setIsRec(false); setRecSec(0); };

  const sendVoice = async () => {
    const cid = activeCid || newChat(activeProj);
    const vm = { role: 'user', content: '[Voice message]', isVoice: true };
    updateChatMsgs(cid, m => [...m, vm]);
    setLoading(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1000, system: sysP(), messages: [{ role: 'user', content: 'Student sent a voice message. Warmly acknowledge and ask what they need help with.' }] }),
      });
      const d = await r.json();
      updateChatMsgs(cid, m => [...m, { role: 'assistant', content: d.content?.map(b => b.text || '').join('') || 'Got your voice message! What can I help with?' }]);
    } catch {
      updateChatMsgs(cid, m => [...m, { role: 'assistant', content: 'Got your voice message! What can I help with?' }]);
    }
    setLoading(false);
  };

  const sendWithId = async (cid, prevMsgs, txt, isCoding = false) => {
    const imgs = atts.filter(a => a.isImage);
    const pdfs = atts.filter(a => a.isPDF);
    const vids = atts.filter(a => a.isVideo);
    const others = atts.filter(a => !a.isImage && !a.isPDF && !a.isVideo);
    const um = {
      role: 'user',
      content: txt || (vids.length ? 'Please analyze this video.' : imgs.length ? 'Please analyze these images.' : pdfs.length ? 'Please review this PDF.' : 'Please review this file.'),
      images: imgs.map(a => a.dataUrl), pdfs: pdfs.map(a => a.name),
      videos: vids.map(a => ({ name: a.name, thumb: a.thumb })), files: others.map(a => a.name), isCoding,
    };
    const allMsgs = [...prevMsgs, um];
    updateChatMsgs(cid, _ => allMsgs);
    if (prevMsgs.length === 0) renameChat(cid, txt);
    setAtts([]); setLoading(true);
    const buildC = (m) => {
      const parts = [];
      m.images?.forEach(dataUrl => {
        const b = dataUrl.split(',')[1];
        const mt = dataUrl.startsWith('data:image/png') ? 'image/png' : dataUrl.startsWith('data:image/gif') ? 'image/gif' : dataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
        parts.push({ type: 'image', source: { type: 'base64', media_type: mt, data: b } });
      });
      if (m.videos?.length) parts.push({ type: 'text', text: `[VIDEO UPLOADED: ${m.videos.map(v => v.name).join(', ')}]\nAnalyze all content — answer any questions shown, explain concepts, summarize.` });
      if (m.pdfs?.length) parts.push({ type: 'text', text: `[PDF UPLOADED: ${m.pdfs.join(', ')}] Help the student with this document.` });
      if (m.files?.length) parts.push({ type: 'text', text: `[FILES: ${m.files.join(', ')}] Help with these files.` });
      if (m.content) parts.push({ type: 'text', text: m.content });
      if (!parts.length) return m.content;
      if (parts.length === 1 && parts[0].type === 'text') return parts[0].text;
      return parts;
    };
    try {
      const apiMsgs = allMsgs.map(m => ({ role: m.role, content: buildC(m) }));
      const r = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1500, system: sysP(), messages: apiMsgs }),
      });
      const d = await r.json();
      const reply = d.content?.map(b => b.text || '').join('') || "I'm having trouble. Please try again!";
      updateChatMsgs(cid, m => [...m, { role: 'assistant', content: reply }]);
    } catch {
      updateChatMsgs(cid, m => [...m, { role: 'assistant', content: 'Something went wrong. Please try again!' }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const send = async (override, isCoding = false) => {
    const txt = override || input.trim();
    if ((!txt && !atts.length) || loading) return;
    setInput('');
    let cid = activeCid;
    if (!cid) {
      cid = uid();
      const chat = { id: cid, title: 'New Chat', msgs: [], projectId: activeProj, ts: Date.now() };
      setChats(prev => [chat, ...prev]); setActiveCid(cid);
    }
    const cur = chats.find(c => c.id === cid);
    await sendWithId(cid, cur?.msgs || [], txt, isCoding);
  };

  const onKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const createProject = p => { setProjects(prev => [p, ...prev]); setActiveProj(p.id); setShowProj(false); newChat(p.id); };
  const deleteProject = id => { setProjects(prev => prev.filter(p => p.id !== id)); if (activeProj === id) setActiveProj(null); };
  const selectProject = id => {
    setActiveProj(id); setShowProj(false);
    const pChat = chats.find(c => c.projectId === id);
    if (pChat) setActiveCid(pChat.id); else newChat(id);
  };

  // ── Flow handlers ──
  // From home: clicking a quick topic goes to grade selector first, then chat
  const handleHomeQuickTopic = (prompt) => {
    setPendingPrompt(prompt);
    setScreen('grade');
  };

  // From home: clicking the input bar goes to grade selector
  const handleHomeInputClick = () => {
    setScreen('grade');
  };

  // From home: Log In button
  const handleGoLogin = () => setScreen('login');

  // After login
  const handleAuth = (u) => {
    setUser(u);
    setScreen('grade');
  };

  // After grade selector
  const handleGradeStart = ({ grade: g, lang: l }) => {
    setGrade(g); setLang(l);
    const gl = GRADE_OPTIONS.find(o => o.value === g)?.label || '';
    const welcome = g === 'prefer_not'
      ? "Hey there! 👋 I'm **ApexHighAI** — your personal high school AI. You can chat, drop files, take photos, upload videos, write code, or manage projects. *I respond in any language!*"
      : `Hey! 👋 I'm **ApexHighAI**, your guide for **${gl}**. Chat, upload files/photos/videos, get coding help, or start a project — I've got you! *I speak every language!*`;
    const id = uid();
    const chat = { id, title: 'Welcome', msgs: [{ role: 'assistant', content: welcome }], ts: Date.now() };
    setChats([chat]); setActiveCid(id); setScreen('chat');
    // If a quick topic was pending, fire it
    if (pendingPrompt) {
      setTimeout(() => sendWithId(id, [{ role: 'assistant', content: welcome }], pendingPrompt), 150);
      setPendingPrompt(null);
    }
  };

  const sideChats = activeProj ? chats.filter(c => c.projectId === activeProj) : chats.filter(c => !c.projectId);

  return (
    <>
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      :root{
        --nv:#0b1526;--nv2:#111e35;--nv3:#16274a;--nv4:#1c3059;
        --gd:#f5c842;--gd2:#e8b820;--gd3:rgba(245,200,66,.12);
        --tl:#2dd4bf;--tl2:#14b8a6;--tl3:rgba(45,212,191,.12);
        --wh:#f0f4ff;--wh2:#c8d3f0;--mu:#8899bb;--mu2:#5c6e8a;
        --bai:#19305a;--red:#f87171;--grn:#4ade80;
        --border:rgba(255,255,255,.07);--border2:rgba(255,255,255,.12);
        --sb-w:268px;
      }
      body{background:var(--nv);font-family:'DM Sans',sans-serif;color:var(--wh);min-height:100vh;overflow:hidden;}

      /* ── HOME PAGE ── */
      .home-page{min-height:100vh;display:flex;flex-direction:column;position:relative;overflow:hidden;}
      .hp-orb1,.hp-orb2,.hp-orb3{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none;opacity:.13;}
      .hp-orb1{width:500px;height:500px;background:var(--tl);top:-140px;right:-80px;}
      .hp-orb2{width:400px;height:400px;background:var(--gd);bottom:-100px;left:-60px;}
      .hp-orb3{width:220px;height:220px;background:#818cf8;top:40%;left:32%;}

      /* Top bar */
      .hp-topbar{display:flex;align-items:center;justify-content:space-between;padding:.85rem 1.5rem;border-bottom:1px solid var(--border);background:rgba(11,21,38,.97);backdrop-filter:blur(12px);position:relative;z-index:10;flex-shrink:0;}
      .hp-logo{display:flex;align-items:center;gap:.55rem;}
      .hp-logo-ic{width:34px;height:34px;background:linear-gradient(135deg,var(--gd),var(--tl));border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:.95rem;}
      .hp-logo-tx{font-family:'Syne',sans-serif;font-weight:800;font-size:1.2rem;background:linear-gradient(90deg,var(--gd),var(--tl));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
      .hp-top-center{position:absolute;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:.28rem;}
      .hp-grade-btn{background:linear-gradient(135deg,var(--gd),var(--gd2));color:var(--nv);border:none;border-radius:100px;font-family:'Syne',sans-serif;font-weight:700;font-size:.82rem;padding:.48rem 1.1rem;cursor:pointer;transition:all .18s;box-shadow:0 3px 14px rgba(245,200,66,.28);}
      .hp-grade-btn:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(245,200,66,.38);}
      .hp-top-right{display:flex;align-items:center;gap:.55rem;}
      .hp-lang-btn{background:var(--tl3);border:1px solid rgba(45,212,191,.2);color:var(--tl);border-radius:100px;font-size:.72rem;font-weight:600;padding:.32rem .7rem;cursor:pointer;transition:all .15s;}
      .hp-lang-btn:hover{background:rgba(45,212,191,.18);}
      .hp-lang-dd{position:absolute;top:calc(100% + .4rem);right:0;background:var(--nv2);border:1px solid var(--border2);border-radius:12px;z-index:100;width:170px;max-height:200px;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,.5);}
      .hp-login-btn{background:transparent;border:1.5px solid rgba(245,200,66,.35);color:var(--gd);border-radius:100px;font-family:'Syne',sans-serif;font-weight:700;font-size:.8rem;padding:.38rem .95rem;cursor:pointer;transition:all .18s;}
      .hp-login-btn:hover{background:var(--gd3);border-color:var(--gd);}

      /* Hero */
      .hp-hero{display:flex;flex-direction:column;align-items:center;text-align:center;padding:2.5rem 1.5rem 1.2rem;position:relative;z-index:1;}
      .hp-badge{display:inline-block;background:rgba(245,200,66,.1);color:var(--gd);font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:.2rem .6rem;border-radius:100px;border:1px solid rgba(245,200,66,.2);margin-bottom:.8rem;}
      .hp-h1{font-family:'Syne',sans-serif;font-weight:800;font-size:2.6rem;letter-spacing:-.02em;background:linear-gradient(90deg,var(--wh),var(--wh2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:.6rem;}
      .hp-sub{color:var(--wh2);font-size:.94rem;line-height:1.65;max-width:520px;margin-bottom:1rem;}
      .hp-sub strong{color:var(--gd);}
      .hp-sub em{color:var(--tl);}
      .hp-about-btn{background:transparent;border:none;color:var(--mu);font-family:'DM Sans',sans-serif;font-size:.78rem;cursor:pointer;text-decoration:underline;text-underline-offset:3px;transition:color .15s;margin-top:.1rem;}
      .hp-about-btn:hover{color:var(--wh2);}

      /* Quick topics */
      .hp-topics-wrap{padding:.2rem 1.5rem .6rem;position:relative;z-index:1;flex-shrink:0;}
      .hp-topics-lbl{font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);margin-bottom:.5rem;text-align:center;}
      .hp-topics-row{display:flex;gap:.4rem;overflow-x:auto;padding-bottom:.3rem;justify-content:center;flex-wrap:wrap;scrollbar-width:none;}
      .hp-topics-row::-webkit-scrollbar{display:none;}
      .hp-topic-chip{display:flex;align-items:center;gap:.3rem;white-space:nowrap;background:var(--nv3);border:1px solid var(--border);color:var(--wh2);border-radius:100px;padding:.38rem .78rem;font-size:.76rem;font-weight:500;cursor:pointer;transition:all .15s;flex-shrink:0;}
      .hp-topic-chip:hover{border-color:var(--gd);color:var(--gd);background:rgba(245,200,66,.07);}

      /* Input bar */
      .hp-input-area{padding:.55rem 1.5rem .85rem;border-top:1px solid var(--border);background:rgba(11,21,38,.98);flex-shrink:0;position:relative;z-index:1;margin-top:auto;}
      .hp-iinner{display:flex;align-items:center;gap:.5rem;background:var(--nv2);border:1.5px solid var(--border);border-radius:15px;padding:.62rem .62rem .62rem .92rem;cursor:pointer;max-width:760px;margin:0 auto;transition:border-color .2s;}
      .hp-iinner:hover{border-color:rgba(245,200,66,.25);}
      .hp-input-placeholder{flex:1;color:var(--mu);font-size:.92rem;}
      .hp-send-btn{width:36px;height:36px;background:linear-gradient(135deg,var(--gd),var(--gd2));border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--nv);font-weight:700;font-size:1rem;}
      .hp-disc{text-align:center;color:var(--mu);font-size:.64rem;margin-top:.45rem;opacity:.55;max-width:760px;margin-left:auto;margin-right:auto;}

      /* ── LOGIN PAGE ── */
      .login-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem 1.2rem;position:relative;overflow:hidden;}

      /* ── ABOUT US PAGE ── */
      .about-page{min-height:100vh;overflow-y:auto;position:relative;padding:0 0 4rem;}
      .ab-orb1,.ab-orb2,.ab-orb3{position:fixed;border-radius:50%;filter:blur(100px);pointer-events:none;opacity:.1;z-index:0;}
      .ab-orb1{width:500px;height:500px;background:var(--tl);top:-100px;right:-100px;}
      .ab-orb2{width:400px;height:400px;background:var(--gd);bottom:0;left:-80px;}
      .ab-orb3{width:260px;height:260px;background:#818cf8;top:40%;left:28%;}
      .ab-wrap{max-width:860px;margin:0 auto;padding:2rem 1.5rem;position:relative;z-index:1;}
      .ab-back{background:none;border:1px solid var(--border);color:var(--mu);font-size:.8rem;padding:.38rem .8rem;border-radius:8px;cursor:pointer;margin-bottom:2rem;transition:all .15s;display:inline-block;}
      .ab-back:hover{border-color:var(--border2);color:var(--wh2);}
      .ab-hero{text-align:center;margin-bottom:3.5rem;}
      .ab-logo-row{display:flex;align-items:center;justify-content:center;gap:.65rem;margin-bottom:.5rem;}
      .ab-logo-ic{width:52px;height:52px;background:linear-gradient(135deg,var(--gd),var(--tl));border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;}
      .ab-logo-tx{font-family:'Syne',sans-serif;font-weight:800;font-size:2rem;background:linear-gradient(90deg,var(--gd),var(--tl));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
      .ab-badge{display:inline-block;background:rgba(245,200,66,.1);color:var(--gd);font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:.22rem .65rem;border-radius:100px;border:1px solid rgba(245,200,66,.22);margin-bottom:1.2rem;}
      .ab-h1{font-family:'Syne',sans-serif;font-weight:800;font-size:2.2rem;line-height:1.2;margin-bottom:1.1rem;background:linear-gradient(135deg,var(--wh),var(--tl));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
      .ab-lead{color:var(--wh2);font-size:.95rem;line-height:1.72;max-width:680px;margin:0 auto;}
      .ab-mission{background:var(--nv2);border:1px solid var(--border);border-radius:20px;padding:2rem 2.2rem;margin-bottom:3rem;}
      .ab-section-h{font-family:'Syne',sans-serif;font-weight:700;font-size:1.3rem;margin-bottom:1rem;background:linear-gradient(90deg,var(--gd),var(--tl));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
      .ab-section-p{color:var(--wh2);font-size:.92rem;line-height:1.72;margin-bottom:.85rem;}
      .ab-section-p:last-child{margin-bottom:0;}
      .ab-features-section{margin-bottom:3rem;}
      .ab-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;margin-top:1.2rem;}
      .ab-card{display:flex;align-items:flex-start;gap:.9rem;background:var(--nv2);border:1px solid var(--border);border-radius:14px;padding:1.1rem 1.15rem;transition:border-color .18s;}
      .ab-card:hover{border-color:rgba(45,212,191,.2);}
      .ab-card-icon{font-size:1.5rem;flex-shrink:0;margin-top:.1rem;}
      .ab-card-title{font-family:'Syne',sans-serif;font-weight:700;font-size:.9rem;color:var(--wh);margin-bottom:.28rem;}
      .ab-card-desc{color:var(--mu);font-size:.8rem;line-height:1.55;}
      .ab-who{margin-bottom:3rem;}
      .ab-who-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.85rem;margin-top:1.2rem;}
      .ab-who-card{background:var(--nv2);border:1px solid var(--border);border-radius:14px;padding:1.2rem 1rem;text-align:center;transition:border-color .18s;}
      .ab-who-card:hover{border-color:rgba(245,200,66,.22);}
      .ab-who-icon{font-size:1.8rem;margin-bottom:.5rem;}
      .ab-who-label{font-family:'Syne',sans-serif;font-weight:700;font-size:.9rem;color:var(--gd);margin-bottom:.28rem;}
      .ab-who-desc{color:var(--mu);font-size:.78rem;line-height:1.5;}
      .ab-cta{background:linear-gradient(135deg,rgba(45,212,191,.08),rgba(245,200,66,.06));border:1px solid rgba(45,212,191,.18);border-radius:22px;padding:2.8rem 2rem;text-align:center;margin-bottom:2rem;}
      .ab-cta-h{font-family:'Syne',sans-serif;font-weight:800;font-size:1.6rem;margin-bottom:.6rem;background:linear-gradient(90deg,var(--gd),var(--tl));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
      .ab-cta-sub{color:var(--mu);font-size:.9rem;line-height:1.6;max-width:480px;margin:0 auto 1.5rem;}
      .ab-cta-btn{background:linear-gradient(135deg,var(--gd),var(--gd2));color:var(--nv);border:none;border-radius:13px;font-family:'Syne',sans-serif;font-weight:700;font-size:.97rem;padding:.88rem 2.2rem;cursor:pointer;transition:all .2s;box-shadow:0 4px 20px rgba(245,200,66,.3);}
      .ab-cta-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(245,200,66,.4);}
      .ab-trust{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:.45rem .75rem;color:var(--mu);font-size:.7rem;}

      /* ── SHARED AUTH CARD ── */
      .lo1,.lo2,.lo3{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none;opacity:.14;}
      .lo1{width:500px;height:500px;background:var(--tl);top:-140px;right:-80px;}
      .lo2{width:400px;height:400px;background:var(--gd);bottom:-100px;left:-60px;}
      .lo3{width:220px;height:220px;background:#818cf8;top:40%;left:32%;}
      .land-card{background:var(--nv2);border:1px solid rgba(245,200,66,.14);border-radius:26px;padding:2.5rem 2.1rem 2.1rem;width:100%;max-width:450px;position:relative;z-index:1;box-shadow:0 32px 80px rgba(0,0,0,.55);animation:cardIn .55s cubic-bezier(.16,1,.3,1) both;}
      @keyframes cardIn{from{opacity:0;transform:translateY(26px) scale(.97)}to{opacity:1;transform:none}}
      .land-logo{display:flex;align-items:center;gap:.65rem;margin-bottom:.4rem;}
      .land-icon{width:44px;height:44px;background:linear-gradient(135deg,var(--gd),var(--tl));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;}
      .land-title{font-family:'Syne',sans-serif;font-weight:800;font-size:1.8rem;letter-spacing:-.02em;background:linear-gradient(90deg,var(--gd),var(--tl));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
      .land-badge{display:inline-block;background:rgba(245,200,66,.1);color:var(--gd);font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:.2rem .58rem;border-radius:100px;border:1px solid rgba(245,200,66,.2);margin-bottom:1.2rem;}
      .land-h{font-family:'Syne',sans-serif;font-weight:700;font-size:1.45rem;line-height:1.25;margin-bottom:.5rem;}
      .land-sub{color:var(--mu);font-size:.88rem;line-height:1.6;margin-bottom:1.5rem;}
      .auth-btns{display:flex;flex-direction:column;gap:.55rem;margin-bottom:.8rem;}
      .auth-btn{display:flex;align-items:center;gap:.7rem;padding:.74rem .95rem;border-radius:12px;border:1.5px solid var(--border2);background:var(--nv3);color:var(--wh);font-family:'DM Sans',sans-serif;font-size:.88rem;font-weight:500;cursor:pointer;transition:all .18s;}
      .auth-btn:hover{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.04);}
      .auth-btn:disabled{opacity:.5;cursor:not-allowed;}
      .auth-btn.google{border-color:rgba(66,133,244,.28);}
      .auth-btn.email-b{border-color:rgba(245,200,66,.28);}
      .aico{font-size:1.05rem;min-width:20px;text-align:center;}
      .aico.g{color:#4285F4;font-weight:800;font-size:.95rem;}
      .divider{display:flex;align-items:center;gap:.65rem;margin:.1rem 0 .7rem;color:var(--mu);font-size:.78rem;}
      .divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--border);}
      .guest-btn{width:100%;background:transparent;border:1.5px dashed rgba(255,255,255,.14);color:var(--wh2);border-radius:12px;font-family:'Syne',sans-serif;font-weight:600;font-size:.88rem;padding:.7rem;cursor:pointer;transition:all .18s;}
      .guest-btn:hover{border-color:rgba(255,255,255,.28);color:var(--wh);}
      .guest-note{text-align:center;color:var(--mu);font-size:.7rem;margin-top:.45rem;}
      .back-btn{background:none;border:none;color:var(--mu);font-size:.8rem;cursor:pointer;margin-bottom:.8rem;padding:0;transition:color .15s;}
      .back-btn:hover{color:var(--wh);}
      .land-h2{font-family:'Syne',sans-serif;font-weight:700;font-size:1.2rem;margin-bottom:.9rem;}
      .auth-err{color:var(--red);font-size:.78rem;margin-bottom:.65rem;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.18);border-radius:8px;padding:.42rem .68rem;}
      .auth-input{width:100%;background:var(--nv3);border:1.5px solid var(--border);border-radius:10px;color:var(--wh);font-family:'DM Sans',sans-serif;font-size:.88rem;padding:.68rem .88rem;margin-bottom:.55rem;outline:none;transition:border-color .18s;}
      .auth-input:focus{border-color:rgba(245,200,66,.38);}
      .auth-input::placeholder{color:var(--mu);}
      .auth-submit{width:100%;background:linear-gradient(135deg,var(--gd),var(--gd2));color:var(--nv);border:none;border-radius:11px;font-family:'Syne',sans-serif;font-weight:700;font-size:.92rem;padding:.8rem;cursor:pointer;margin-top:.25rem;transition:all .18s;}
      .auth-submit:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(245,200,66,.32);}
      .auth-submit:disabled{opacity:.5;cursor:not-allowed;transform:none;}
      .auth-switch{text-align:center;color:var(--mu);font-size:.78rem;margin-top:.7rem;}
      .auth-switch span{color:var(--tl);cursor:pointer;text-decoration:underline;}
      .land-trust{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:.45rem .75rem;margin-top:1.2rem;color:var(--mu);font-size:.7rem;}
      .td{width:3px;height:3px;background:var(--mu);border-radius:50%;opacity:.35;}

      /* ── GRADE SELECTOR (ONBOARDING) ── */
      .onboarding{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem 1.5rem;position:relative;overflow:hidden;}
      .bo1,.bo2,.bo3{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none;opacity:.15;}
      .bo1{width:500px;height:500px;background:var(--tl);top:-150px;right:-100px;}
      .bo2{width:400px;height:400px;background:var(--gd);bottom:-100px;left:-80px;}
      .bo3{width:250px;height:250px;background:#6366f1;top:40%;left:30%;}
      .ob-card{background:var(--nv2);border:1px solid rgba(245,200,66,.14);border-radius:26px;padding:2.6rem 2.2rem 2.2rem;width:100%;max-width:490px;position:relative;z-index:1;box-shadow:0 32px 80px rgba(0,0,0,.5);animation:cardIn .6s cubic-bezier(.16,1,.3,1) both;}
      .logo-lk{display:flex;align-items:center;gap:.7rem;margin-bottom:.45rem;}
      .logo-ic{width:46px;height:46px;background:linear-gradient(135deg,var(--gd),var(--tl));border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:1.35rem;}
      .logo-tx{font-family:'Syne',sans-serif;font-weight:800;font-size:1.85rem;letter-spacing:-.02em;background:linear-gradient(90deg,var(--gd),var(--tl));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
      .logo-tag{display:inline-block;background:rgba(245,200,66,.1);color:var(--gd);font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:.2rem .6rem;border-radius:100px;border:1px solid rgba(245,200,66,.2);margin-bottom:1rem;}
      .wname{font-size:.88rem;font-weight:600;margin-bottom:.45rem;}
      .ob-h{font-family:'Syne',sans-serif;font-weight:700;font-size:1.45rem;line-height:1.25;margin-bottom:.5rem;}
      .ob-sub{color:var(--mu);font-size:.88rem;line-height:1.6;margin-bottom:1.5rem;}
      .flbl{font-family:'Syne',sans-serif;font-weight:600;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:var(--wh2);margin-bottom:.62rem;display:block;}
      .gg{display:grid;grid-template-columns:1fr 1fr;gap:.55rem;margin-bottom:1.4rem;}
      .gbtn{background:var(--nv3);border:1.5px solid var(--border);border-radius:11px;color:var(--wh2);font-family:'DM Sans',sans-serif;font-size:.85rem;font-weight:500;padding:.7rem .5rem;cursor:pointer;transition:all .18s;text-align:center;}
      .gbtn:hover{border-color:rgba(245,200,66,.38);color:var(--wh);}
      .gbtn.sel{background:var(--gd3);border-color:var(--gd);color:var(--gd);font-weight:600;}
      .gbtn.prefer{grid-column:1/-1;color:var(--mu);font-size:.82rem;}
      .gbtn.prefer.sel{color:var(--tl);border-color:var(--tl);background:var(--tl3);}
      .err-m{color:var(--red);font-size:.78rem;margin-top:-.65rem;margin-bottom:.75rem;}
      .lw{position:relative;margin-bottom:1.4rem;}
      .lbtn{width:100%;background:var(--nv3);border:1.5px solid var(--border);border-radius:11px;color:var(--wh2);font-family:'DM Sans',sans-serif;font-size:.86rem;padding:.66rem .9rem;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:border-color .18s;}
      .lbtn:hover{border-color:rgba(45,212,191,.32);}
      .ldrop{position:absolute;top:calc(100% + .28rem);left:0;right:0;background:var(--nv2);border:1px solid var(--border2);border-radius:12px;z-index:200;max-height:200px;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,.5);}
      .lopt{padding:.56rem .95rem;font-size:.85rem;cursor:pointer;color:var(--wh2);transition:background .12s;}
      .lopt:hover{background:rgba(255,255,255,.05);color:var(--wh);}
      .lopt.act{color:var(--tl);font-weight:600;}
      .s-btn{width:100%;background:linear-gradient(135deg,var(--gd),var(--gd2));color:var(--nv);border:none;border-radius:13px;font-family:'Syne',sans-serif;font-weight:700;font-size:.97rem;padding:.9rem;cursor:pointer;transition:all .2s;box-shadow:0 4px 20px rgba(245,200,66,.3);}
      .s-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(245,200,66,.4);}
      .t-strip{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:.45rem .75rem;margin-top:1.2rem;color:var(--mu);font-size:.7rem;}

      /* ── CHAT APP SHELL ── */
      .app-shell{display:flex;height:100vh;overflow:hidden;background:var(--nv);}
      .sidebar{width:var(--sb-w);flex-shrink:0;background:var(--nv2);border-right:1px solid var(--border);display:flex;flex-direction:column;transition:transform .25s ease,width .25s ease;overflow:hidden;}
      .sidebar.closed{width:0;transform:translateX(-100%);}
      .sb-top{padding:1rem .85rem .6rem;flex-shrink:0;}
      .sb-logo{display:flex;align-items:center;gap:.55rem;margin-bottom:.9rem;}
      .sb-logo-ic{width:32px;height:32px;background:linear-gradient(135deg,var(--gd),var(--tl));border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:.9rem;}
      .sb-logo-tx{font-family:'Syne',sans-serif;font-weight:800;font-size:1.1rem;background:linear-gradient(90deg,var(--gd),var(--tl));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
      .sb-new{width:100%;background:var(--gd3);border:1px solid rgba(245,200,66,.22);color:var(--gd);border-radius:10px;font-family:'Syne',sans-serif;font-weight:600;font-size:.82rem;padding:.58rem;cursor:pointer;transition:all .18s;display:flex;align-items:center;justify-content:center;gap:.4rem;}
      .sb-new:hover{background:rgba(245,200,66,.18);border-color:rgba(245,200,66,.35);}
      .sb-actions{display:flex;gap:.4rem;margin-top:.5rem;}
      .sb-action{flex:1;background:transparent;border:1px solid var(--border);color:var(--mu);border-radius:9px;font-family:'DM Sans',sans-serif;font-size:.75rem;font-weight:500;padding:.48rem .3rem;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:.3rem;}
      .sb-action:hover{border-color:var(--border2);color:var(--wh2);background:rgba(255,255,255,.04);}
      .sb-action.active{border-color:var(--tl);color:var(--tl);background:var(--tl3);}
      .sb-section{padding:.55rem .85rem .25rem;flex-shrink:0;}
      .sb-section-lbl{font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--mu2);}
      .sb-proj-pill{display:flex;align-items:center;gap:.4rem;padding:.42rem .6rem;border-radius:8px;cursor:pointer;margin:.2rem 0;transition:all .15s;color:var(--wh2);font-size:.82rem;}
      .sb-proj-pill:hover{background:rgba(255,255,255,.04);}
      .sb-proj-pill.active{background:rgba(45,212,191,.1);color:var(--tl);}
      .sb-proj-pill .pico{font-size:.8rem;}
      .sb-chats{flex:1;overflow-y:auto;padding:.3rem .55rem;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.08) transparent;}
      .sb-chats::-webkit-scrollbar{width:3px;}
      .sb-chats::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px;}
      .sb-chat-item{display:flex;align-items:center;gap:.5rem;padding:.52rem .7rem;border-radius:9px;cursor:pointer;transition:all .14s;color:var(--wh2);font-size:.82rem;position:relative;}
      .sb-chat-item:hover{background:rgba(255,255,255,.04);}
      .sb-chat-item.active{background:rgba(255,255,255,.07);color:var(--wh);}
      .sb-chat-ico{font-size:.75rem;opacity:.6;flex-shrink:0;}
      .sb-chat-txt{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .sb-chat-ts{font-size:.65rem;color:var(--mu2);flex-shrink:0;}
      .sb-bottom{padding:.65rem .85rem;border-top:1px solid var(--border);flex-shrink:0;}
      .sb-user{display:flex;align-items:center;gap:.55rem;padding:.45rem .4rem;border-radius:9px;cursor:pointer;transition:background .14s;}
      .sb-user:hover{background:rgba(255,255,255,.04);}
      .sb-user-av{width:30px;height:30px;background:linear-gradient(135deg,var(--gd),var(--tl));border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:var(--nv);font-family:'Syne',sans-serif;}
      .sb-user-info{flex:1;min-width:0;}
      .sb-user-name{font-size:.82rem;font-weight:600;color:var(--wh);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .sb-user-sub{font-size:.68rem;color:var(--mu);}
      .sb-aitools{padding:.5rem .85rem;border-top:1px solid var(--border);flex-shrink:0;}
      .sb-aitools-lbl{font-size:.62rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--mu2);margin-bottom:.4rem;}
      .sb-aitool{display:flex;align-items:center;gap:.5rem;padding:.42rem .5rem;border-radius:9px;text-decoration:none;margin-bottom:.3rem;transition:all .15s;border:1px solid transparent;}
      .sb-aitool.det{background:rgba(248,113,113,.07);border-color:rgba(248,113,113,.18);}
      .sb-aitool.det:hover{background:rgba(248,113,113,.13);border-color:rgba(248,113,113,.3);}
      .sb-aitool.hum{background:rgba(45,212,191,.07);border-color:rgba(45,212,191,.18);}
      .sb-aitool.hum:hover{background:rgba(45,212,191,.13);border-color:rgba(45,212,191,.3);}
      .sb-aitool-ico{font-size:.9rem;}
      .sb-aitool-info{flex:1;min-width:0;}
      .sb-aitool-name{font-size:.78rem;font-weight:600;display:block;}
      .sb-aitool.det .sb-aitool-name{color:#fca5a5;}
      .sb-aitool.hum .sb-aitool-name{color:var(--tl);}
      .sb-aitool-desc{font-size:.65rem;color:var(--mu);display:block;}
      .sb-aitool-stars{font-size:.58rem;color:var(--gd);opacity:.8;}
      .main-area{flex:1;display:flex;flex-direction:column;min-width:0;background:var(--nv);}
      .topbar{display:flex;align-items:center;gap:.6rem;padding:.75rem 1.2rem;border-bottom:1px solid var(--border);background:rgba(11,21,38,.97);backdrop-filter:blur(12px);flex-shrink:0;position:sticky;top:0;z-index:10;}
      .tb-toggle{background:transparent;border:1px solid var(--border);color:var(--mu);width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.9rem;transition:all .15s;flex-shrink:0;}
      .tb-toggle:hover{border-color:var(--border2);color:var(--wh2);}
      .tb-title{font-family:'Syne',sans-serif;font-weight:700;font-size:.95rem;color:var(--wh);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .tb-right{display:flex;align-items:center;gap:.4rem;}
      .tb-badge{font-size:.67rem;font-weight:600;padding:.18rem .5rem;border-radius:100px;}
      .tb-grade{background:var(--gd3);border:1px solid rgba(245,200,66,.2);color:var(--gd);}
      .tb-lang{background:var(--tl3);border:1px solid rgba(45,212,191,.2);color:var(--tl);cursor:pointer;position:relative;}
      .tb-lang:hover{background:rgba(45,212,191,.18);}
      .lang-dd{position:absolute;top:calc(100% + .4rem);right:0;background:var(--nv2);border:1px solid var(--border2);border-radius:12px;z-index:100;width:170px;max-height:200px;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,.5);}
      .lang-dd .lopt{padding:.52rem .88rem;}
      .tb-proj{background:rgba(129,140,248,.1);border:1px solid rgba(129,140,248,.2);color:#a5b4fc;}
      .msgs-area{flex:1;overflow-y:auto;padding:1.6rem 0;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.07) transparent;}
      .msgs-area::-webkit-scrollbar{width:4px;}
      .msgs-area::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:4px;}
      .msgs-inner{max-width:760px;margin:0 auto;padding:0 1.4rem;display:flex;flex-direction:column;gap:1.2rem;}
      .mrow{display:flex;align-items:flex-start;gap:.75rem;animation:mIn .28s cubic-bezier(.16,1,.3,1) both;}
      .urow{flex-direction:row-reverse;}
      @keyframes mIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      .av{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;flex-shrink:0;margin-top:.08rem;}
      .aav{background:linear-gradient(135deg,var(--gd),var(--tl));color:var(--nv);font-family:'Syne',sans-serif;}
      .uav{background:rgba(255,255,255,.08);color:var(--gd);border:1px solid var(--border);}
      .bub{max-width:min(76%,620px);border-radius:18px;padding:.9rem 1.1rem;font-size:.92rem;line-height:1.68;}
      .abub{background:var(--bai);color:var(--wh);border-bottom-left-radius:5px;border:1px solid rgba(255,255,255,.05);}
      .ubub{background:var(--gd);color:#0b1526;border-bottom-right-radius:5px;font-weight:500;}
      .bcon h2,.bcon h3,.bcon h4{font-family:'Syne',sans-serif;font-weight:700;margin:.85rem 0 .32rem;color:var(--tl);}
      .bcon h4{font-size:.92rem;color:var(--gd);}
      .bcon ul,.bcon ol{padding-left:1.3rem;margin:.38rem 0;}
      .bcon li{margin-bottom:.24rem;}
      .bcon strong{color:var(--tl);}
      .ubub .bcon strong{color:#0b1526;}
      .bcon p{margin-bottom:.5rem;}
      .vtag,.ctag{font-size:.72rem;font-weight:600;margin-bottom:.38rem;}
      .vtag{color:var(--tl);}
      .ctag{color:#a5b4fc;}
      .mimg-row{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.45rem;}
      .mimg{max-width:170px;max-height:170px;object-fit:cover;border-radius:9px;border:1px solid rgba(255,255,255,.1);}
      .mvid{display:flex;align-items:center;gap:.5rem;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:9px;overflow:hidden;font-size:.78rem;color:var(--wh2);}
      .mvid img{width:68px;height:44px;object-fit:cover;}
      .mvid span{padding:.18rem .55rem;}
      .mfile-row{display:flex;flex-wrap:wrap;gap:.32rem;margin-bottom:.4rem;}
      .mfile{background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:7px;padding:.26rem .55rem;font-size:.76rem;color:var(--wh2);}
      .code-block{background:#0d1f38;border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;margin:.5rem 0;font-family:'JetBrains Mono',monospace;}
      .code-header{display:flex;align-items:center;justify-content:space-between;padding:.45rem .75rem;background:rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.07);}
      .code-lang{font-size:.7rem;color:var(--tl);font-weight:600;text-transform:uppercase;letter-spacing:.06em;}
      .copy-btn{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:var(--wh2);border-radius:6px;padding:.22rem .55rem;font-size:.7rem;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif;}
      .copy-btn:hover{background:rgba(255,255,255,.13);color:var(--wh);}
      pre{padding:.85rem .95rem;overflow-x:auto;font-size:.82rem;line-height:1.6;color:#e2e8f0;}
      .inline-code{background:rgba(45,212,191,.1);color:var(--tl);border-radius:5px;padding:.1rem .35rem;font-family:'JetBrains Mono',monospace;font-size:.83em;}
      .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:2rem;text-align:center;}
      .es-icon{font-size:3.5rem;margin-bottom:1rem;opacity:.7;}
      .es-h{font-family:'Syne',sans-serif;font-weight:700;font-size:1.5rem;margin-bottom:.5rem;background:linear-gradient(90deg,var(--gd),var(--tl));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
      .es-sub{color:var(--mu);font-size:.9rem;max-width:420px;line-height:1.6;margin-bottom:1.8rem;}
      .qt-row{display:flex;flex-wrap:wrap;gap:.45rem;justify-content:center;max-width:560px;}
      .qt-chip{display:flex;align-items:center;gap:.3rem;white-space:nowrap;background:var(--nv3);border:1px solid var(--border);color:var(--wh2);border-radius:100px;padding:.4rem .82rem;font-size:.78rem;font-weight:500;cursor:pointer;transition:all .15s;}
      .qt-chip:hover{border-color:var(--gd);color:var(--gd);background:rgba(245,200,66,.07);}
      .trow{display:flex;align-items:flex-start;gap:.75rem;animation:mIn .28s ease both;}
      .tdots{background:var(--bai);border:1px solid rgba(255,255,255,.05);border-radius:18px;border-bottom-left-radius:5px;padding:.85rem 1.05rem;}
      .dots{display:flex;gap:5px;align-items:center;}
      .dots span{width:7px;height:7px;background:var(--mu);border-radius:50%;animation:bounce 1.2s infinite;}
      .dots span:nth-child(2){animation-delay:.18s;}
      .dots span:nth-child(3){animation-delay:.36s;}
      @keyframes bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-6px);opacity:1}}
      .qt-strip{padding:.4rem 1.4rem .15rem;max-width:760px;margin:0 auto;width:100%;}
      .qt-lbl{font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);margin-bottom:.45rem;}
      .qt-scrl{display:flex;gap:.4rem;overflow-x:auto;padding-bottom:.3rem;scrollbar-width:none;}
      .qt-scrl::-webkit-scrollbar{display:none;}
      .att-row{display:flex;flex-wrap:wrap;gap:.45rem;padding:.4rem 1.2rem 0;max-width:760px;margin:0 auto;width:100%;}
      .att-item{position:relative;display:flex;flex-direction:column;align-items:center;gap:.18rem;}
      .att-item img{width:56px;height:56px;object-fit:cover;border-radius:9px;border:1.5px solid var(--border2);}
      .att-icon{width:56px;height:56px;background:var(--nv3);border:1.5px solid var(--border);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:.62rem;font-weight:700;letter-spacing:.04em;}
      .att-icon.pdf{color:var(--red);border-color:rgba(248,113,113,.28);}
      .att-icon.vid{color:var(--tl);border-color:rgba(45,212,191,.28);}
      .att-vw{position:relative;width:56px;height:56px;}
      .att-vw img{width:100%;height:100%;object-fit:cover;border-radius:9px;}
      .play-b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.42);border-radius:9px;font-size:1rem;}
      .att-rm{position:absolute;top:-5px;right:-5px;width:17px;height:17px;background:var(--red);border:none;border-radius:50%;color:#fff;font-size:.68rem;cursor:pointer;display:flex;align-items:center;justify-content:center;}
      .att-lbl{font-size:.62rem;color:var(--mu);max-width:58px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .vid-st{padding:.28rem 1.4rem;font-size:.76rem;color:var(--tl);font-weight:500;flex-shrink:0;}
      .ibar{padding:.55rem 1.4rem .8rem;border-top:1px solid var(--border);background:rgba(11,21,38,.98);flex-shrink:0;}
      .ibar-inner{max-width:760px;margin:0 auto;}
      .itools{display:flex;gap:.35rem;margin-bottom:.38rem;flex-wrap:wrap;}
      .tbtn{display:flex;align-items:center;gap:.26rem;background:var(--nv3);border:1px solid var(--border);color:var(--mu);border-radius:8px;padding:.3rem .58rem;font-size:.72rem;font-weight:500;cursor:pointer;transition:all .13s;white-space:nowrap;}
      .tbtn:hover{border-color:rgba(45,212,191,.35);color:var(--tl);}
      .tbtn.rec{border-color:var(--red);color:var(--red);background:rgba(248,113,113,.07);animation:pulse 1s infinite;}
      .tbtn.code-btn{border-color:rgba(129,140,248,.3);color:#a5b4fc;}
      .tbtn.code-btn:hover{border-color:rgba(129,140,248,.55);background:rgba(129,140,248,.07);}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.52}}
      .iinner{display:flex;align-items:flex-end;gap:.5rem;background:var(--nv2);border:1.5px solid var(--border);border-radius:15px;padding:.58rem .58rem .58rem .88rem;transition:border-color .2s;}
      .iinner:focus-within{border-color:rgba(245,200,66,.3);}
      .minput{flex:1;background:transparent;border:none;outline:none;color:var(--wh);font-family:'DM Sans',sans-serif;font-size:.92rem;line-height:1.5;resize:none;max-height:115px;overflow-y:auto;scrollbar-width:none;}
      .minput::placeholder{color:var(--mu);}
      .sbtn{width:36px;height:36px;background:linear-gradient(135deg,var(--gd),var(--gd2));border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .17s;color:var(--nv);font-weight:700;}
      .sbtn:hover:not(:disabled){transform:scale(1.08);box-shadow:0 4px 14px rgba(245,200,66,.36);}
      .sbtn:disabled{opacity:.36;cursor:not-allowed;}
      .disc{text-align:center;color:var(--mu);font-size:.66rem;margin-top:.4rem;opacity:.58;}
      .cp-overlay{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:300;display:flex;align-items:center;justify-content:center;padding:1rem;}
      .cp-modal{background:var(--nv2);border:1px solid var(--border2);border-radius:22px;width:100%;max-width:520px;overflow:hidden;animation:cardIn .3s ease both;}
      .cp-hdr{display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.3rem;border-bottom:1px solid var(--border);}
      .cp-title{font-family:'Syne',sans-serif;font-weight:700;font-size:1.05rem;}
      .cp-cls{background:rgba(255,255,255,.07);border:none;color:var(--wh2);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;transition:background .15s;}
      .cp-cls:hover{background:rgba(255,255,255,.12);}
      .cp-sub{color:var(--mu);font-size:.85rem;padding:.8rem 1.3rem .5rem;line-height:1.5;}
      .cp-langs{display:flex;flex-wrap:wrap;gap:.4rem;padding:.2rem 1.3rem .8rem;}
      .cp-lang{background:var(--nv3);border:1.5px solid var(--border);color:var(--wh2);border-radius:8px;padding:.38rem .7rem;font-size:.78rem;font-weight:500;cursor:pointer;transition:all .15s;}
      .cp-lang:hover{border-color:rgba(129,140,248,.4);color:#a5b4fc;}
      .cp-lang.sel{background:rgba(129,140,248,.12);border-color:rgba(129,140,248,.4);color:#a5b4fc;font-weight:600;}
      .cp-ta{width:calc(100% - 2.6rem);margin:0 1.3rem;background:var(--nv3);border:1.5px solid var(--border);border-radius:12px;color:var(--wh);font-family:'DM Sans',sans-serif;font-size:.88rem;padding:.75rem .9rem;outline:none;resize:vertical;min-height:110px;transition:border-color .18s;line-height:1.55;}
      .cp-ta:focus{border-color:rgba(129,140,248,.38);}
      .cp-ta::placeholder{color:var(--mu);}
      .cp-actions{display:flex;justify-content:flex-end;gap:.6rem;padding:.9rem 1.3rem;}
      .cp-cancel{background:transparent;border:1px solid var(--border);color:var(--mu);border-radius:10px;padding:.58rem 1rem;font-size:.85rem;cursor:pointer;transition:all .15s;}
      .cp-cancel:hover{border-color:var(--border2);color:var(--wh2);}
      .cp-go{background:linear-gradient(135deg,#818cf8,#6366f1);border:none;color:#fff;border-radius:10px;padding:.58rem 1.2rem;font-family:'Syne',sans-serif;font-weight:700;font-size:.88rem;cursor:pointer;transition:all .18s;}
      .cp-go:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 16px rgba(99,102,241,.4);}
      .cp-go:disabled{opacity:.4;cursor:not-allowed;}
      .pj-panel{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:300;display:flex;align-items:center;justify-content:center;padding:1rem;}
      .pj-inner{background:var(--nv2);border:1px solid var(--border2);border-radius:22px;width:100%;max-width:480px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;animation:cardIn .3s ease both;}
      .pj-hdr{display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.3rem;border-bottom:1px solid var(--border);flex-shrink:0;}
      .pj-title{font-family:'Syne',sans-serif;font-weight:700;font-size:1.05rem;}
      .pj-cls{background:rgba(255,255,255,.07);border:none;color:var(--wh2);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;}
      .pj-cls:hover{background:rgba(255,255,255,.12);}
      .pj-new{margin:.75rem 1.3rem .4rem;background:var(--gd3);border:1px solid rgba(245,200,66,.22);color:var(--gd);border-radius:10px;font-family:'Syne',sans-serif;font-weight:600;font-size:.85rem;padding:.6rem;cursor:pointer;transition:all .18s;width:calc(100% - 2.6rem);}
      .pj-new:hover{background:rgba(245,200,66,.18);}
      .pj-form{padding:.5rem 1.3rem .8rem;border-bottom:1px solid var(--border);}
      .pj-inp{width:100%;background:var(--nv3);border:1.5px solid var(--border);border-radius:10px;color:var(--wh);font-family:'DM Sans',sans-serif;font-size:.88rem;padding:.66rem .88rem;margin-bottom:.5rem;outline:none;transition:border-color .18s;}
      .pj-inp:focus{border-color:rgba(245,200,66,.35);}
      .pj-inp::placeholder{color:var(--mu);}
      .pj-fa{display:flex;gap:.5rem;justify-content:flex-end;}
      .pj-cancel{background:transparent;border:1px solid var(--border);color:var(--mu);border-radius:9px;padding:.5rem .9rem;font-size:.82rem;cursor:pointer;}
      .pj-create{background:linear-gradient(135deg,var(--gd),var(--gd2));color:var(--nv);border:none;border-radius:9px;padding:.5rem 1rem;font-family:'Syne',sans-serif;font-weight:700;font-size:.82rem;cursor:pointer;}
      .pj-create:disabled{opacity:.4;cursor:not-allowed;}
      .pj-list{flex:1;overflow-y:auto;padding:.5rem .7rem;}
      .pj-empty{text-align:center;color:var(--mu);font-size:.85rem;padding:2rem 1rem;}
      .pj-item{display:flex;align-items:center;gap:.6rem;padding:.65rem .7rem;border-radius:11px;cursor:pointer;transition:all .14px;border:1px solid transparent;}
      .pj-item:hover{background:rgba(255,255,255,.04);border-color:var(--border);}
      .pj-item.pj-sel{background:rgba(245,200,66,.07);border-color:rgba(245,200,66,.2);}
      .pj-item-icon{font-size:1.2rem;flex-shrink:0;}
      .pj-item-info{flex:1;min-width:0;}
      .pj-item-name{font-size:.88rem;font-weight:600;color:var(--wh);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .pj-item-desc{font-size:.75rem;color:var(--mu);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .pj-item-ts{font-size:.68rem;color:var(--mu2);display:block;margin-top:.1rem;}
      .pj-del{background:transparent;border:none;color:var(--mu2);cursor:pointer;font-size:.85rem;padding:.2rem;border-radius:5px;transition:color .13s;}
      .pj-del:hover{color:var(--red);}
      .modal{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:400;display:flex;align-items:center;justify-content:center;padding:1rem;}
      .cam-box{background:var(--nv2);border-radius:20px;overflow:hidden;width:100%;max-width:510px;border:1px solid var(--border2);}
      .cam-hdr{display:flex;align-items:center;justify-content:space-between;padding:.82rem 1.1rem;border-bottom:1px solid var(--border);}
      .cam-title{font-family:'Syne',sans-serif;font-weight:700;font-size:.92rem;}
      .cam-cls{background:rgba(255,255,255,.08);border:none;color:var(--wh2);width:28px;height:28px;border-radius:7px;cursor:pointer;}
      .cam-vid{width:100%;aspect-ratio:4/3;background:#000;display:block;object-fit:cover;}
      .cam-ctrl{display:flex;align-items:center;justify-content:center;padding:.82rem;}
      .snap-btn{width:52px;height:52px;background:linear-gradient(135deg,var(--gd),var(--gd2));border:none;border-radius:50%;cursor:pointer;font-size:1.2rem;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(245,200,66,.36);transition:transform .14s;}
      .snap-btn:hover{transform:scale(1.08);}
      .cam-thumbs{display:flex;gap:.38rem;flex-wrap:wrap;padding:0 1rem .42rem;max-height:90px;overflow-y:auto;}
      .cam-th{width:46px;height:46px;object-fit:cover;border-radius:7px;border:1.5px solid var(--border2);}
      .use-photos{margin:.35rem 1rem .82rem;width:calc(100% - 2rem);background:linear-gradient(135deg,var(--tl),var(--tl2));color:var(--nv);border:none;border-radius:11px;font-family:'Syne',sans-serif;font-weight:700;font-size:.86rem;padding:.68rem;cursor:pointer;}
      .drag-ov{position:fixed;inset:0;background:rgba(45,212,191,.06);border:3px dashed var(--tl);z-index:150;display:flex;align-items:center;justify-content:center;pointer-events:none;}
      .drag-msg{font-family:'Syne',sans-serif;font-weight:700;font-size:1.3rem;color:var(--tl);}
      @media(max-width:768px){
        :root{--sb-w:240px;}
        .sidebar{position:fixed;left:0;top:0;bottom:0;z-index:50;transform:translateX(0);}
        .sidebar.closed{transform:translateX(-100%);width:var(--sb-w);}
        .msgs-inner{padding:0 .9rem;}
        .ibar{padding:.48rem .9rem .7rem;}
        .topbar{padding:.65rem .9rem;}
        .hp-topbar{padding:.7rem 1rem;}
        .hp-top-center{position:static;transform:none;}
        .hp-topbar{flex-wrap:wrap;gap:.5rem;}
        .hp-h1{font-size:1.9rem;}
        .ab-who-grid{grid-template-columns:repeat(2,1fr);}
        .ab-grid{grid-template-columns:1fr;}
      }
      `}</style>

      {isDrag && (
        <div className="drag-ov"><div className="drag-msg">📂 Drop files, PDFs, photos or videos</div></div>
      )}

      {showCam && (
        <div className="modal">
          <div className="cam-box">
            <div className="cam-hdr">
              <span className="cam-title">📸 Camera — unlimited photos</span>
              <button className="cam-cls" onClick={closeCam}>✕</button>
            </div>
            <video ref={camRef} className="cam-vid" muted playsInline />
            <div className="cam-ctrl"><button className="snap-btn" onClick={snap}>📷</button></div>
            {camPhotos.length > 0 && (
              <>
                <div className="cam-thumbs">{camPhotos.map((p, i) => <img key={i} src={p} alt="" className="cam-th" />)}</div>
                <button className="use-photos" onClick={useCamPhotos}>✓ Use {camPhotos.length} Photo{camPhotos.length > 1 ? 's' : ''}</button>
              </>
            )}
          </div>
        </div>
      )}

      {showCode && <CodingPanel onSendPrompt={t => { send(t, true); }} onClose={() => setShowCode(false)} />}

      {showProj && (
        <div className="pj-panel" onClick={e => { if (e.target.className === 'pj-panel') setShowProj(false); }}>
          <div className="pj-inner">
            <ProjectPanel projects={projects} onNew={createProject} onSelect={selectProject} onDelete={deleteProject} selectedId={activeProj} onClose={() => setShowProj(false)} />
          </div>
        </div>
      )}

      {/* ── SCREEN ROUTING ── */}
      {screen === 'home' && (
        <HomePage
          onGoGrade={() => setScreen('grade')}
          onGoLogin={handleGoLogin}
          onGoAbout={() => setScreen('about')}
          onGoChat={handleHomeQuickTopic}
        />
      )}

      {screen === 'about' && <AboutUs onBack={() => setScreen('home')} />}

      {screen === 'login' && (
        <LoginPage onContinue={handleAuth} onBack={() => setScreen('home')} />
      )}

      {screen === 'grade' && (
        <GradeSelector user={user} onStart={handleGradeStart} onBack={() => setScreen(user ? 'login' : 'home')} />
      )}

      {screen === 'chat' && (
        <div className="app-shell"
          onDragOver={e => { e.preventDefault(); setIsDrag(true); }}
          onDragLeave={() => setIsDrag(false)}
          onDrop={onDrop}>
          <div className={`sidebar${sideOpen ? '' : ' closed'}`}>
            <div className="sb-top">
              <div className="sb-logo">
                <div className="sb-logo-ic">🎓</div>
                <span className="sb-logo-tx">ApexHighAI</span>
              </div>
              <button className="sb-new" onClick={() => { const id = newChat(activeProj); setActiveCid(id); }}>✏️ New Chat</button>
              <div className="sb-actions">
                <button className={`sb-action${showProj ? ' active' : ''}`} onClick={() => setShowProj(true)}>📁 Projects</button>
                <button className="sb-action" onClick={() => setShowCode(true)}>💻 Code</button>
              </div>
            </div>
            {activeProj && (
              <div className="sb-section">
                <div className="sb-section-lbl">Active Project</div>
                <div className="sb-proj-pill active">
                  <span className="pico">📁</span>
                  <span>{projects.find(p => p.id === activeProj)?.name || 'Project'}</span>
                </div>
                <div className="sb-proj-pill" onClick={() => setActiveProj(null)}>
                  <span className="pico">💬</span><span>All Chats</span>
                </div>
              </div>
            )}
            <div className="sb-section">
              <div className="sb-section-lbl">{activeProj ? 'Project Chats' : 'Recent Chats'}</div>
            </div>
            <div className="sb-chats">
              {sideChats.length === 0 && (
                <p style={{ color: 'var(--mu2)', fontSize: '.78rem', padding: '.3rem .7rem' }}>No chats yet</p>
              )}
              {sideChats.map(c => (
                <div key={c.id} className={`sb-chat-item${c.id === activeCid ? ' active' : ''}`} onClick={() => setActiveCid(c.id)}>
                  <span className="sb-chat-ico">💬</span>
                  <span className="sb-chat-txt">{c.title}</span>
                  <span className="sb-chat-ts">{timeAgo(c.ts)}</span>
                </div>
              ))}
            </div>
            <div className="sb-aitools">
              <div className="sb-aitools-lbl">🛠 AI Tools</div>
              <a className="sb-aitool det" href="https://gptzero.me" target="_blank" rel="noopener noreferrer">
                <span className="sb-aitool-ico">🔍</span>
                <div className="sb-aitool-info">
                  <span className="sb-aitool-name">GPTZero</span>
                  <span className="sb-aitool-desc">Best AI Detector</span>
                </div>
                <span className="sb-aitool-stars">★★★★★</span>
              </a>
              <a className="sb-aitool hum" href="https://undetectable.ai" target="_blank" rel="noopener noreferrer">
                <span className="sb-aitool-ico">✍️</span>
                <div className="sb-aitool-info">
                  <span className="sb-aitool-name">Undetectable.ai</span>
                  <span className="sb-aitool-desc">Best AI Humanizer</span>
                </div>
                <span className="sb-aitool-stars">★★★★★</span>
              </a>
            </div>
            <div className="sb-bottom">
              <div className="sb-user" onClick={() => { setScreen('home'); setUser(null); setChats([]); setGrade(''); setLang('auto'); setActiveProj(null); }}>
                <div className="sb-user-av">{(user?.name || 'G')[0].toUpperCase()}</div>
                <div className="sb-user-info">
                  <div className="sb-user-name">{user?.name || 'Guest'}</div>
                  <div className="sb-user-sub">{user?.isGuest ? 'Guest · click to sign in' : user?.provider || 'signed in'}</div>
                </div>
                <span style={{ color: 'var(--mu)', fontSize: '.8rem' }}>↩</span>
              </div>
            </div>
          </div>

          <div className="main-area">
            <div className="topbar">
              <button className="tb-toggle" onClick={() => setSideOpen(v => !v)}>☰</button>
              <span className="tb-title">{activeChat?.title || 'ApexHighAI'}</span>
              <div className="tb-right">
                {grade && grade !== 'prefer_not' && (
                  <span className="tb-badge tb-grade">{GRADE_OPTIONS.find(o => o.value === grade)?.label}</span>
                )}
                {activeProj && (
                  <span className="tb-badge tb-proj">📁 {projects.find(p => p.id === activeProj)?.name}</span>
                )}
                <div style={{ position: 'relative' }}>
                  <span className="tb-badge tb-lang" onClick={() => setShowLangM(v => !v)}>
                    🌐 {LANGUAGES.find(l => l.code === lang)?.label}
                  </span>
                  {showLangM && (
                    <div className="lang-dd">
                      {LANGUAGES.map(l => (
                        <div key={l.code} className={`lopt${lang === l.code ? ' act' : ''}`}
                          onClick={() => { setLang(l.code); setShowLangM(false); }}>
                          {l.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!activeChat ? (
              <div className="msgs-area">
                <div className="msgs-inner">
                  <div className="empty-state">
                    <div className="es-icon">🎓</div>
                    <h2 className="es-h">What can I help you with?</h2>
                    <p className="es-sub">Ask me anything about high school — SAT prep, homework, essays, coding, college planning, or start a new project.</p>
                    <div className="qt-row">
                      {QUICK_TOPICS.map(t => (
                        <button key={t.label} className="qt-chip" onClick={() => send(t.prompt)}>
                          <span>{t.icon}</span>{t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="msgs-area">
                <div className="msgs-inner">
                  {msgs.length <= 1 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div className="qt-lbl" style={{ marginBottom: '.5rem', fontSize: '.68rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--mu2)' }}>
                        Quick Topics
                      </div>
                      <div className="qt-scrl">
                        {QUICK_TOPICS.map(t => (
                          <button key={t.label} className="qt-chip" onClick={() => send(t.prompt)}>
                            <span>{t.icon}</span>{t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {msgs.map((m, i) => <MsgBubble key={i} msg={m} />)}
                  {loading && (
                    <div className="trow">
                      <div className="av aav">S</div>
                      <div className="tdots"><Dots /></div>
                    </div>
                  )}
                  <div ref={chatEnd} />
                </div>
              </div>
            )}

            {vidStatus && <div className="vid-st">{vidStatus}</div>}
            <AttachPrev atts={atts} onRm={i => setAtts(prev => prev.filter((_, idx) => idx !== i))} />

            <div className="ibar">
              <div className="ibar-inner">
                <div className="itools">
                  <button className="tbtn code-btn" onClick={() => setShowCode(true)}>💻 Code</button>
                  <button className="tbtn" style={{ borderColor: 'rgba(245,200,66,.28)', color: 'var(--gd)' }} onClick={() => setShowProj(true)}>📁 Projects</button>
                  <button className="tbtn" onClick={() => fileRef.current?.click()}>📂 File</button>
                  <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.csv,.pptx,.xlsx" style={{ display: 'none' }} onChange={e => processFiles(Array.from(e.target.files))} />
                  <button className="tbtn" onClick={() => pdfRef.current?.click()}>📄 PDF</button>
                  <input ref={pdfRef} type="file" multiple accept="application/pdf" style={{ display: 'none' }} onChange={e => processFiles(Array.from(e.target.files))} />
                  <button className="tbtn" onClick={() => photoRef.current?.click()}>🖼 Photo</button>
                  <input ref={photoRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => processFiles(Array.from(e.target.files))} />
                  <button className="tbtn" onClick={openCam}>📷 Camera</button>
                  <button className="tbtn" onClick={() => vidRef.current?.click()}>🎬 Video</button>
                  <input ref={vidRef} type="file" multiple accept="video/*" style={{ display: 'none' }} onChange={e => processFiles(Array.from(e.target.files))} />
                  {!isRec ? (
                    <button className="tbtn" onClick={startRec}>🎙 Voice</button>
                  ) : (
                    <button className="tbtn rec" onClick={stopRec}>
                      🔴 {String(Math.floor(recSec / 60)).padStart(2, '0')}:{String(recSec % 60).padStart(2, '0')} Stop
                    </button>
                  )}
                  <button className="tbtn" onClick={() => setInput('Generate an image of ')}>🎨 Create Image</button>
                </div>
                <div className="iinner">
                  <textarea ref={inputRef} className="minput" rows={1}
                    placeholder="Ask anything… or drop a file, photo, PDF, or video"
                    value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                    onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 115) + 'px'; }} />
                  <button className="sbtn" onClick={() => send()} disabled={(!input.trim() && !atts.length) || loading}>↑</button>
                </div>
                <p className="disc">ApexHighAI · AI-powered · All languages supported · Always verify important info with your school</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
