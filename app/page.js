"use client";
import { useState, useEffect, useRef } from "react";

// ─── CONFIGURATION ───
const STEPS = ["setup", "interpret", "mirror"];

const DEFAULT_CRITERIA = [
  "Resourceful defiance — creative problem-solving when the obvious path is blocked",
  "Voluntary difficulty — choosing harder paths when easier ones were available",
  "Relentless dissatisfaction — refusing to stay comfortable",
];

const SAMPLE_TRANSCRIPT = `Interviewer: So tell me about your journey. What were you doing before this?

Candidate: I was at McKinsey for about two and a half years, mostly in the Delhi office. I joined straight out of IIT Bombay. It was the obvious path — campus placement, good brand, parents were thrilled. I was on the TMT practice, working on telco strategy mostly.

Interviewer: And what made you leave?

Candidate: Honestly, I was good at it. That was the problem. I kept getting staffed on these massive transformation projects, and I'd do well, get great reviews, but I never felt like I was building anything. Every deck I made was a recommendation that someone else would implement — or more often, wouldn't. I remember this one project where we spent four months on a digital transformation roadmap for a large telco. Beautiful work. They shelved it two weeks after we presented. And I thought, I just spent four months of my life on a PDF.

Interviewer: So you went straight into starting something?

Candidate: Not exactly. I first joined a Series B edtech company as a product manager. I thought maybe I just needed to be on the building side. But it was... comfortable? They had product-market fit, they had funding, my job was basically optimizing conversion funnels. Important work, but I was employee number 180. Nobody needed me specifically.

Interviewer: How long were you there?

Candidate: Eight months. My manager was confused when I left. He said I was on track for a promotion. But I'd started tinkering on weekends with this idea around vernacular content for blue-collar workers — short video tutorials for things like appliance repair, basic electrical work. I was going to Nehru Place on weekends, talking to these repair shop guys, filming them, putting stuff on YouTube. It started getting traction. Like, real traction — 50K views on some videos with zero marketing spend.

Interviewer: And that became your startup?

Candidate: Yeah. I quit and went full-time on it. No funding, no co-founder initially. I burned through my McKinsey savings in about five months. My parents were... let's say unsupportive. I was living in a PG in Lajpat Nagar, which was a significant lifestyle downgrade from McKinsey. But the users were real. I had repair shop owners calling me asking for more videos. One guy in Patna told me he learned to fix washing machines from my videos and now that's half his business. That's when I knew it wasn't a hobby.

Interviewer: What happened with funding?

Candidate: I got rejected by everybody. Every VC said the same thing — great mission, unclear monetization. Which was fair, I didn't have a revenue model. I was just making content. But then I met this angel investor at a random event in Koramangala — I wasn't even supposed to be in Bangalore, I'd gone for a friend's wedding and crashed this startup meetup. She wrote me a 25 lakh cheque on basically a handshake. That kept us alive for another eight months.

Interviewer: You said "us" — when did you get a co-founder?

Candidate: So this is actually a weird story. I posted a job listing on LinkedIn for a video editor. This guy applies, and his resume is completely wrong for the role — he's a backend engineer from Flipkart. But his cover letter was incredible. He'd been watching all our videos, had built a small recommendation engine on his own time that could match repair tutorials to user queries. I didn't hire him as an editor. I brought him on as co-founder. That was probably the best decision I've made.

Interviewer: Where did it go from there?

Candidate: We pivoted hard. Moved from just video content to a full marketplace — connecting repair professionals with customers, with the training content as the acquisition funnel. Got into Y Combinator's batch, raised a seed round. We're at about 2,000 monthly active service providers now across three cities.

Interviewer: What's been the hardest part?

Candidate: The pivot was brutal. We had users who loved the content and suddenly we're asking them to change their behavior completely — list on a marketplace, accept digital payments, manage bookings. Half our most engaged content users never converted to the marketplace. I had to accept that the thing people loved about us wasn't the thing that would make us a business. That was a hard lesson. I still think about it.

Interviewer: If you could go back and change anything, what would it be?

Candidate: I would have left McKinsey earlier. Every month I stayed was a month I was getting more comfortable with a life that wasn't mine. The edtech job too — I knew within the first month it wasn't right, but I stayed eight months because leaving quickly looks bad on your resume. I optimized for what other people would think instead of what I actually knew. That's the thing I'd change — I'd trust my own signal faster.`;

// ─── AI PROMPTS ───
const FACT_EXTRACTION_PROMPT = `You are a precise fact extractor for talent evaluation conversations. 

Given a transcript and the evaluator's FRAMEWORK CRITERIA, extract exactly 5-6 key BEHAVIORAL FACTS — the most evaluatively meaningful decisions, actions, transitions, or outcomes.

You will receive the transcript AND the evaluator's criteria. Use the criteria to guide selection — but include 1 fact that is ambiguous or doesn't clearly map to any criterion, as these reveal interpretation patterns.

Rules:
- Extract EXACTLY 5 or 6 facts. No more, no less. Be highly selective.
- Strip all framing, emotion, and narrative. Just what happened.
- Each fact should be a single, neutral statement of something the person DID or something that HAPPENED.
- Do NOT include opinions, assessments, or interpretations.
- Pick the facts that carry the most signal about who this person is — moments of real decision, not routine events.
- Order chronologically when possible.

Respond ONLY with a JSON array of strings. No preamble, no markdown, no backticks. Example:
["Left a senior role at Company X after 2 years to join an early-stage startup","Relocated to a new city without a job lined up","Built a prototype while working full-time"]`;

const MIRROR_PROMPT = `You are an honest mirror for talent investors. Your job is to make their thinking clearer — not to evaluate the candidate yourself, but to show the evaluator where their reasoning is grounded and where it's floating.

CRITICAL FRAMING: The transcript is the candidate's PERFORMANCE, not objective truth. Candidates craft narratives. A well-told story is not the same as demonstrated behavior. Your job is to help the evaluator separate what was CLAIMED from what was SHOWN.

- "I left because it felt hollow" = a CLAIM. The candidate is telling you why they did something. You don't know if it's true.
- "Burned through savings for 5 months living in a PG" = BEHAVIORAL EVIDENCE. Something that actually happened, with a cost attached.
- "I crashed a meetup and got a cheque on a handshake" = a STORY. Could be true, could be polished. Either way, it's the candidate's framing.

If all criteria score positively, that's a red flag, not a green light. Real conversations rarely map perfectly to a framework unless the candidate has rehearsed their narrative to hit exactly those notes — or unless the evaluator is reading what they want to see. Flag this pattern explicitly.

You will receive:
1. The evaluator's FRAMEWORK CRITERIA
2. EXTRACTED FACTS from the conversation
3. The evaluator's INTERPRETATIONS of each fact
4. The evaluator's ADDITIONAL COMMENTS — gut reactions, skepticism, things the structured flow missed. PAY CLOSE ATTENTION TO THESE. If the evaluator was skeptical, engage with their skepticism — don't dismiss it. Ask why they felt that way. Their gut is data.
5. The original TRANSCRIPT

For each criterion, assign ONE status:
- THERE: Behavioral evidence (not just claims) supports this. Distinguish what's demonstrated from what's narrated.
- STRETCHED: Some surface evidence exists, but it's mostly the candidate's self-report, or the evaluator is reading more into it than the evidence supports. Be specific about what's a claim vs. what's a fact.
- NOT THERE: The trait isn't demonstrated by evidence. The candidate may have told a story that sounds like this trait, but telling a story about resourcefulness is not the same as demonstrating resourcefulness.

For the evidence field on each criterion: always separate "the candidate said X" from "the evidence shows Y." If the only evidence is the candidate's own narrative, say so. That's not automatically disqualifying — but the evaluator should know they're trusting the story, not observing the behavior.

Also identify interpretations that don't map to any stated criterion. These are EMERGING PATTERNS — things the evaluator keeps noticing outside their framework. Could be worth adding as criteria.

Write a debrief that's 3-5 sentences. This is the most important part. Talk to the evaluator like a sharp colleague who's helping them think. If they were skeptical in their interpretations, engage with that — what were they picking up on? If they were too generous, say so. If the candidate told a perfect story that maps to every criterion, flag the pattern. The goal is to make the evaluator's own thinking visible and sharper, not to judge the candidate.

Respond ONLY with JSON, no preamble, no markdown, no backticks:
{
  "criteria_analysis": [
    {
      "criterion": "the criterion text",
      "status": "there" | "stretched" | "not_there",
      "evidence": "1-2 sentences. Separate claims from behavioral evidence. Be specific."
    }
  ],
  "emerging_patterns": [
    {
      "interpretation_index": 3,
      "interpretation_text": "the interpretation",
      "pattern_name": "Short label (e.g., 'Narrative coherence bias')",
      "suggestion": "One sentence — could this be a real criterion?"
    }
  ],
  "debrief": "3-5 sentences. Talk to the evaluator about their thinking, not about the candidate. Make their reasoning visible to them."
}`;

// ─── STYLES ───
const palette = {
  bg: "#0C0C0F",
  surface: "#141419",
  surfaceHover: "#1A1A21",
  border: "#25252E",
  borderActive: "#3D3D4A",
  text: "#E8E6E1",
  textMuted: "#8A8A95",
  textDim: "#5C5C68",
  accent: "#D4A574",
  accentDim: "#9E7B5A",
  green: "#6B9E78",
  amber: "#C4924A",
  red: "#B56B6B",
  tagBg: "#1E1E26",
};

const fonts = {
  display: "'Newsreader', Georgia, serif",
  body: "'DM Sans', -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

// ─── COMPONENTS ───

function ProgressBar({ step }) {
  const idx = STEPS.indexOf(step);
  const labels = ["Paste & Criteria", "Facts & Interpretation", "The Mirror"];
  return (
    <div style={{ display: "flex", gap: 0, marginBottom: 48 }}>
      {labels.map((label, i) => (
        <div key={i} style={{ flex: 1, position: "relative" }}>
          <div
            style={{
              height: 2,
              background: i <= idx ? palette.accent : palette.border,
              transition: "background 0.6s ease",
            }}
          />
          <div
            style={{
              marginTop: 12,
              fontFamily: fonts.mono,
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: i <= idx ? palette.accent : palette.textDim,
              transition: "color 0.4s ease",
            }}
          >
            {String(i + 1).padStart(2, "0")} — {label}
          </div>
        </div>
      ))}
    </div>
  );
}

function SetupStep({ transcript, setTranscript, criteria, setCriteria, onNext }) {
  const addCriterion = () => setCriteria([...criteria, ""]);
  const removeCriterion = (i) => setCriteria(criteria.filter((_, idx) => idx !== i));
  const updateCriterion = (i, val) => {
    const updated = [...criteria];
    updated[i] = val;
    setCriteria(updated);
  };

  const canProceed = transcript.trim().length > 50 && criteria.filter((c) => c.trim()).length >= 2;

  const loadSample = () => setTranscript(SAMPLE_TRANSCRIPT);

  return (
    <div style={{ animation: "fadeIn 0.5s ease" }}>
      <h2
        style={{
          fontFamily: fonts.display,
          fontSize: 28,
          fontWeight: 400,
          fontStyle: "italic",
          color: palette.text,
          marginBottom: 8,
        }}
      >
        What happened, and what are you looking for?
      </h2>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: palette.textMuted, marginBottom: 36, lineHeight: 1.6 }}>
        Paste your conversation transcript and define the criteria you say you evaluate against.
      </p>

      {/* Transcript */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <label
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: palette.textDim,
          }}
        >
          Transcript
        </label>
        <button
          onClick={loadSample}
          style={{
            background: "none",
            border: "none",
            fontFamily: fonts.mono,
            fontSize: 10,
            color: palette.accent,
            cursor: "pointer",
            padding: 0,
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            opacity: 0.8,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.target.style.opacity = 1)}
          onMouseLeave={(e) => (e.target.style.opacity = 0.8)}
        >
          Try with sample transcript
        </button>
      </div>
      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Paste your conversation transcript here..."
        style={{
          width: "100%",
          minHeight: 200,
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: 8,
          padding: 20,
          fontFamily: fonts.body,
          fontSize: 14,
          lineHeight: 1.7,
          color: palette.text,
          resize: "vertical",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = palette.borderActive)}
        onBlur={(e) => (e.target.style.borderColor = palette.border)}
      />

      {/* Criteria */}
      <div style={{ marginTop: 36 }}>
        <label
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: palette.textDim,
            display: "block",
            marginBottom: 10,
          }}
        >
          Your Framework Criteria
        </label>
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: palette.textDim, marginBottom: 16, lineHeight: 1.5 }}>
          What do you say you look for? Be honest — this is the mirror you'll be held to.
        </p>

        {criteria.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
            <span style={{ fontFamily: fonts.mono, fontSize: 11, color: palette.textDim, minWidth: 20 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <input
              value={c}
              onChange={(e) => updateCriterion(i, e.target.value)}
              placeholder="e.g., Resourceful defiance — creative problem-solving when blocked"
              style={{
                flex: 1,
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                borderRadius: 6,
                padding: "12px 16px",
                fontFamily: fonts.body,
                fontSize: 14,
                color: palette.text,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = palette.borderActive)}
              onBlur={(e) => (e.target.style.borderColor = palette.border)}
            />
            {criteria.length > 2 && (
              <button
                onClick={() => removeCriterion(i)}
                style={{
                  background: "none",
                  border: "none",
                  color: palette.textDim,
                  cursor: "pointer",
                  fontSize: 18,
                  padding: "4px 8px",
                  fontFamily: fonts.mono,
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}

        {criteria.length < 6 && (
          <button
            onClick={addCriterion}
            style={{
              background: "none",
              border: `1px dashed ${palette.border}`,
              borderRadius: 6,
              padding: "10px 16px",
              fontFamily: fonts.mono,
              fontSize: 12,
              color: palette.textDim,
              cursor: "pointer",
              marginTop: 4,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = palette.borderActive;
              e.target.style.color = palette.textMuted;
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = palette.border;
              e.target.style.color = palette.textDim;
            }}
          >
            + Add criterion
          </button>
        )}
      </div>

      {/* Next */}
      <div style={{ marginTop: 48, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onNext}
          disabled={!canProceed}
          style={{
            background: canProceed ? palette.accent : palette.border,
            color: canProceed ? palette.bg : palette.textDim,
            border: "none",
            borderRadius: 6,
            padding: "14px 32px",
            fontFamily: fonts.mono,
            fontSize: 12,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: canProceed ? "pointer" : "not-allowed",
            transition: "all 0.3s",
            fontWeight: 600,
          }}
        >
          Extract Facts →
        </button>
      </div>
    </div>
  );
}

function InterpretStep({ facts, setFacts, interpretations, setInterpretations, comments, setComments, onNext, onBack, onRequestMoreFacts, loadingMore }) {
  const [newFact, setNewFact] = useState("");

  const deleteFact = (i) => {
    setFacts(facts.filter((_, idx) => idx !== i));
    setInterpretations(interpretations.filter((_, idx) => idx !== i));
  };

  const addFact = () => {
    if (!newFact.trim()) return;
    setFacts([...facts, newFact.trim()]);
    setInterpretations([...interpretations, ""]);
    setNewFact("");
  };

  const updateInterp = (i, val) => {
    const updated = [...interpretations];
    updated[i] = val;
    setInterpretations(updated);
  };

  const hasInterpretations = interpretations.some((interp) => interp.trim().length > 0);

  return (
    <div style={{ animation: "fadeIn 0.5s ease" }}>
      <h2
        style={{
          fontFamily: fonts.display,
          fontSize: 28,
          fontWeight: 400,
          fontStyle: "italic",
          color: palette.text,
          marginBottom: 8,
        }}
      >
        Here's what AI extracted. Make it yours.
      </h2>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: palette.textMuted, marginBottom: 36, lineHeight: 1.6 }}>
        Delete facts that don't matter, add ones AI missed, ask for more. Then for each fact — what does it mean to you?
      </p>

      {/* Facts list */}
      <div style={{ marginBottom: 24 }}>
        {facts.map((fact, i) => (
          <div
            key={i}
            style={{
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: 8,
              padding: 20,
              marginBottom: 12,
              transition: "border-color 0.2s",
            }}
          >
            {/* Fact header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ flex: 1, marginRight: 12 }}>
                <span style={{ fontFamily: fonts.mono, fontSize: 10, color: palette.textDim, letterSpacing: "0.1em" }}>
                  FACT {i + 1}
                </span>
                <p
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 16,
                    fontWeight: 400,
                    color: palette.text,
                    lineHeight: 1.5,
                    margin: "6px 0 0",
                  }}
                >
                  {fact}
                </p>
              </div>
              <button
                onClick={() => deleteFact(i)}
                title="Remove this fact"
                style={{
                  background: "none",
                  border: "none",
                  color: palette.textDim,
                  cursor: "pointer",
                  fontSize: 16,
                  padding: "2px 6px",
                  fontFamily: fonts.mono,
                  borderRadius: 4,
                  transition: "color 0.2s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.target.style.color = palette.red)}
                onMouseLeave={(e) => (e.target.style.color = palette.textDim)}
              >
                ×
              </button>
            </div>

            {/* Interpretation */}
            <textarea
              value={interpretations[i] || ""}
              onChange={(e) => updateInterp(i, e.target.value)}
              placeholder="What does this tell you about this person?"
              rows={2}
              style={{
                width: "100%",
                background: palette.bg,
                border: `1px solid ${palette.border}`,
                borderRadius: 6,
                padding: "12px 14px",
                fontFamily: fonts.body,
                fontSize: 13,
                lineHeight: 1.6,
                color: palette.text,
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = palette.borderActive)}
              onBlur={(e) => (e.target.style.borderColor = palette.border)}
            />
          </div>
        ))}
      </div>

      {/* Add fact / Generate more */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <input
          value={newFact}
          onChange={(e) => setNewFact(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addFact()}
          placeholder="Add a fact AI missed..."
          style={{
            flex: 1,
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            borderRadius: 6,
            padding: "12px 14px",
            fontFamily: fonts.body,
            fontSize: 13,
            color: palette.text,
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = palette.borderActive)}
          onBlur={(e) => (e.target.style.borderColor = palette.border)}
        />
        <button
          onClick={addFact}
          disabled={!newFact.trim()}
          style={{
            background: newFact.trim() ? palette.accent : palette.border,
            color: newFact.trim() ? palette.bg : palette.textDim,
            border: "none",
            borderRadius: 6,
            padding: "12px 16px",
            fontFamily: fonts.mono,
            fontSize: 12,
            cursor: newFact.trim() ? "pointer" : "not-allowed",
            fontWeight: 600,
            whiteSpace: "nowrap",
            transition: "all 0.2s",
          }}
        >
          + Add
        </button>
      </div>

      <button
        onClick={onRequestMoreFacts}
        disabled={loadingMore}
        style={{
          background: "none",
          border: `1px dashed ${palette.border}`,
          borderRadius: 6,
          padding: "10px 16px",
          fontFamily: fonts.mono,
          fontSize: 11,
          color: loadingMore ? palette.textDim : palette.textMuted,
          cursor: loadingMore ? "wait" : "pointer",
          transition: "all 0.2s",
          marginBottom: 40,
        }}
        onMouseEnter={(e) => { if (!loadingMore) { e.target.style.borderColor = palette.borderActive; e.target.style.color = palette.text; }}}
        onMouseLeave={(e) => { e.target.style.borderColor = palette.border; e.target.style.color = palette.textMuted; }}
      >
        {loadingMore ? "Generating..." : "✦ Ask AI for more facts"}
      </button>

      {/* Your Take — comments section */}
      <div style={{ borderTop: `1px solid ${palette.border}`, paddingTop: 32, marginBottom: 32 }}>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: palette.textDim,
            marginBottom: 8,
          }}
        >
          Your Take
        </div>
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: palette.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
          What did the conversation feel like that facts can't capture? What's your gut saying? What biases might be at play?
        </p>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder={"e.g., There was a moment where they described failing — the self-awareness was striking but none of the facts captured it. Also I think I'm being generous because they reminded me of someone I backed before."}
          style={{
            width: "100%",
            minHeight: 120,
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            borderRadius: 8,
            padding: 20,
            fontFamily: fonts.body,
            fontSize: 14,
            lineHeight: 1.7,
            color: palette.text,
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = palette.borderActive)}
          onBlur={(e) => (e.target.style.borderColor = palette.border)}
        />
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: `1px solid ${palette.border}`,
            borderRadius: 6,
            padding: "10px 20px",
            fontFamily: fonts.mono,
            fontSize: 12,
            color: palette.textMuted,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>

        <button
          onClick={onNext}
          disabled={!hasInterpretations}
          style={{
            background: hasInterpretations ? palette.accent : palette.border,
            color: hasInterpretations ? palette.bg : palette.textDim,
            border: "none",
            borderRadius: 6,
            padding: "14px 32px",
            fontFamily: fonts.mono,
            fontSize: 12,
            fontWeight: 600,
            cursor: hasInterpretations ? "pointer" : "not-allowed",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            transition: "all 0.2s",
          }}
        >
          Show Me The Mirror →
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    there: { color: palette.green, label: "THERE", icon: "✓" },
    stretched: { color: palette.amber, label: "STRETCHED", icon: "~" },
    not_there: { color: palette.red, label: "NOT THERE", icon: "✗" },
  };
  const c = config[status] || config.not_there;
  return (
    <span
      style={{
        fontFamily: fonts.mono,
        fontSize: 10,
        letterSpacing: "0.1em",
        color: c.color,
        background: `${c.color}15`,
        padding: "4px 10px",
        borderRadius: 4,
        border: `1px solid ${c.color}30`,
      }}
    >
      {c.icon} {c.label}
    </span>
  );
}

function MirrorStep({ mirrorData, facts, interpretations, onReset }) {
  if (!mirrorData) return null;

  const { criteria_analysis, emerging_patterns, debrief } = mirrorData;

  return (
    <div style={{ animation: "fadeIn 0.6s ease" }}>
      {/* Header */}
      <h2
        style={{
          fontFamily: fonts.display,
          fontSize: 28,
          fontWeight: 400,
          fontStyle: "italic",
          color: palette.text,
          marginBottom: 8,
        }}
      >
        The Mirror
      </h2>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: palette.textMuted, marginBottom: 36, lineHeight: 1.6 }}>
        No advice. No score. Just what your reasoning actually looked like.
      </p>

      {/* Debrief */}
      {debrief && (
        <div
          style={{
            background: palette.surface,
            border: `1px solid ${palette.accent}40`,
            borderRadius: 10,
            padding: 28,
            marginBottom: 32,
          }}
        >
          <p
            style={{
              fontFamily: fonts.display,
              fontSize: 16,
              fontWeight: 400,
              color: palette.text,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {debrief}
          </p>
        </div>
      )}

      {/* Criteria */}
      <div style={{ marginBottom: 36 }}>
        {(criteria_analysis || []).map((ca, i) => (
          <div
            key={i}
            style={{
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: 8,
              padding: 22,
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <span style={{ fontFamily: fonts.body, fontSize: 14, color: palette.text, flex: 1, marginRight: 16 }}>
                {ca.criterion}
              </span>
              <StatusBadge status={ca.status} />
            </div>
            <p style={{ fontFamily: fonts.body, fontSize: 13, color: palette.textMuted, lineHeight: 1.6, margin: 0 }}>
              {ca.evidence}
            </p>
          </div>
        ))}
      </div>

      {/* Emerging patterns */}
      {emerging_patterns?.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: palette.green,
              marginBottom: 8,
            }}
          >
            Emerging Patterns
          </div>
          <p style={{ fontFamily: fonts.body, fontSize: 13, color: palette.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
            You noticed things your framework doesn't capture yet. These might be worth adding as explicit criteria.
          </p>

          {emerging_patterns.map((ep, i) => (
            <div
              key={i}
              style={{
                background: palette.surface,
                border: `1px solid ${palette.green}25`,
                borderLeft: `3px solid ${palette.green}`,
                borderRadius: "0 8px 8px 0",
                padding: 20,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  color: palette.green,
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                {ep.pattern_name}
              </div>
              <p style={{ fontFamily: fonts.body, fontSize: 14, color: palette.text, margin: "0 0 8px" }}>
                "{ep.interpretation_text}"
              </p>
              <p
                style={{
                  fontFamily: fonts.display,
                  fontSize: 14,
                  fontStyle: "italic",
                  color: palette.textMuted,
                  margin: 0,
                }}
              >
                → {ep.suggestion}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Full interpretation log */}
      <details style={{ marginBottom: 36 }}>
        <summary
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: palette.textDim,
            cursor: "pointer",
            marginBottom: 16,
            listStyle: "none",
          }}
        >
          ▸ View all facts & your interpretations
        </summary>
        <div style={{ marginTop: 16 }}>
          {facts.map((fact, i) => (
            <div
              key={i}
              style={{
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                borderRadius: 8,
                padding: 18,
                marginBottom: 8,
              }}
            >
              <div style={{ fontFamily: fonts.mono, fontSize: 10, color: palette.textDim, marginBottom: 8 }}>
                FACT {i + 1}
              </div>
              <p style={{ fontFamily: fonts.body, fontSize: 13, color: palette.text, margin: "0 0 10px" }}>{fact}</p>
              <p style={{ fontFamily: fonts.body, fontSize: 13, color: palette.accentDim, margin: 0, fontStyle: "italic" }}>
                → {interpretations[i]}
              </p>
            </div>
          ))}
        </div>
      </details>

      {/* Reset */}
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 16, paddingBottom: 32 }}>
        <button
          onClick={onReset}
          style={{
            background: "none",
            border: `1px solid ${palette.border}`,
            borderRadius: 6,
            padding: "12px 28px",
            fontFamily: fonts.mono,
            fontSize: 12,
            color: palette.textMuted,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = palette.accent;
            e.target.style.color = palette.accent;
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = palette.border;
            e.target.style.color = palette.textMuted;
          }}
        >
          Start New Evaluation
        </button>
      </div>
    </div>
  );
}

function LoadingState({ message }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 20px",
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: `2px solid ${palette.border}`,
          borderTopColor: palette.accent,
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: palette.textMuted, marginTop: 20 }}>{message}</p>
    </div>
  );
}

// ─── MAIN APP ───
export default function InterpretationLayer() {
  const [step, setStep] = useState("setup");
  const [transcript, setTranscript] = useState("");
  const [criteria, setCriteria] = useState([...DEFAULT_CRITERIA]);
  const [facts, setFacts] = useState([]);
  const [interpretations, setInterpretations] = useState([]);
  const [mirrorData, setMirrorData] = useState(null);
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState(null);

  const callClaude = async (systemPrompt, userMessage, maxTokens = 1000) => {
    const response = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: systemPrompt,
        message: userMessage,
        maxTokens,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.text.replace(/```json|```/g, "").trim();
  };

  const extractFacts = async () => {
    setLoading(true);
    setLoadingMsg("Extracting behavioral facts from transcript...");
    setError(null);
    try {
      const userMsg = `EVALUATOR'S CRITERIA:\n${criteria.filter(c => c.trim()).map((c, i) => `${i+1}. ${c}`).join("\n")}\n\nTRANSCRIPT:\n${transcript}`;
      const raw = await callClaude(FACT_EXTRACTION_PROMPT, userMsg);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("No facts extracted");
      setFacts(parsed);
      setInterpretations(new Array(parsed.length).fill(""));
      setStep("interpret");
    } catch (e) {
      setError("Failed to extract facts. Check your transcript and try again. (" + e.message + ")");
    } finally {
      setLoading(false);
    }
  };

  const requestMoreFacts = async () => {
    setLoadingMore(true);
    try {
      const morePrompt = `You are a precise fact extractor. The evaluator has already extracted some facts from a conversation transcript. Generate 3 ADDITIONAL behavioral facts that were NOT already extracted. Focus on different moments, subtler signals, or facts the first pass might have missed.

Already extracted facts:
${facts.map((f, i) => `${i+1}. ${f}`).join("\n")}

Rules:
- Extract exactly 3 NEW facts not covered above.
- Strip all framing. Just what happened.
- Each fact = a single neutral statement of something the person DID or that HAPPENED.
- Look for moments the first pass might have overlooked — subtler signals, smaller decisions, context clues.

Respond ONLY with a JSON array of strings. No preamble, no markdown, no backticks.`;
      const userMsg = `EVALUATOR'S CRITERIA:\n${criteria.filter(c => c.trim()).map((c, i) => `${i+1}. ${c}`).join("\n")}\n\nTRANSCRIPT:\n${transcript}`;
      const raw = await callClaude(morePrompt, userMsg);
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setFacts([...facts, ...parsed]);
        setInterpretations([...interpretations, ...new Array(parsed.length).fill("")]);
      }
    } catch (e) {
      setError("Failed to generate more facts. (" + e.message + ")");
    } finally {
      setLoadingMore(false);
    }
  };

  const generateMirror = async () => {
    setLoading(true);
    setLoadingMsg("Generating your mirror analysis...");
    setError(null);
    try {
      const userMsg = JSON.stringify({
        criteria: criteria.filter((c) => c.trim()),
        facts,
        interpretations: interpretations.map((interp, i) => ({
          fact_index: i,
          fact: facts[i],
          interpretation: interp,
        })),
        evaluator_additional_comments: comments || "(none provided)",
        transcript_excerpt: transcript.slice(0, 6000),
      });
      const raw = await callClaude(MIRROR_PROMPT, userMsg, 2000);
      const parsed = JSON.parse(raw);
      setMirrorData(parsed);
      setStep("mirror");
    } catch (e) {
      setError("Failed to generate mirror. Try again. (" + e.message + ")");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("setup");
    setTranscript("");
    setCriteria([...DEFAULT_CRITERIA]);
    setFacts([]);
    setInterpretations([]);
    setMirrorData(null);
    setComments("");
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: palette.bg,
        color: palette.text,
        padding: "40px 20px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        ::placeholder { color: ${palette.textDim}; }
        textarea::-webkit-scrollbar, div::-webkit-scrollbar { width: 6px; }
        textarea::-webkit-scrollbar-track, div::-webkit-scrollbar-track { background: transparent; }
        textarea::-webkit-scrollbar-thumb, div::-webkit-scrollbar-thumb { background: ${palette.border}; border-radius: 3px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        details > summary::-webkit-details-marker { display: none; }
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Title */}
        <div style={{ marginBottom: 48 }}>
          <h1
            style={{
              fontFamily: fonts.display,
              fontSize: 16,
              fontWeight: 400,
              color: palette.accent,
              letterSpacing: "0.04em",
              margin: "0 0 2px",
            }}
          >
            Blind Spot
          </h1>
          <p style={{ fontFamily: fonts.mono, fontSize: 10, color: palette.textDim, margin: 0, letterSpacing: "0.08em" }}>
            SEE HOW YOU ACTUALLY JUDGE
          </p>
        </div>

        <ProgressBar step={step} />

        {/* Error display */}
        {error && (
          <div
            style={{
              background: `${palette.red}15`,
              border: `1px solid ${palette.red}40`,
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
              fontFamily: fonts.body,
              fontSize: 13,
              color: palette.red,
            }}
          >
            {error}
          </div>
        )}

        {/* Steps */}
        {loading ? (
          <LoadingState message={loadingMsg} />
        ) : step === "setup" ? (
          <SetupStep
            transcript={transcript}
            setTranscript={setTranscript}
            criteria={criteria}
            setCriteria={setCriteria}
            onNext={extractFacts}
          />
        ) : step === "interpret" ? (
          <InterpretStep
            facts={facts}
            setFacts={setFacts}
            interpretations={interpretations}
            setInterpretations={setInterpretations}
            comments={comments}
            setComments={setComments}
            onNext={generateMirror}
            onBack={() => setStep("setup")}
            onRequestMoreFacts={requestMoreFacts}
            loadingMore={loadingMore}
          />
        ) : step === "mirror" ? (
          <MirrorStep mirrorData={mirrorData} facts={facts} interpretations={interpretations} onReset={reset} />
        ) : null}
      </div>
    </div>
  );
}
