import { useEffect, useMemo, useState } from 'react'
import './App.css'

type LearnerLevel = 'M1' | 'M2' | 'M3'

type DiagnosisCategory =
  | 'Cardiovascular'
  | 'Pulmonary'
  | 'GI / hepatobiliary'
  | 'Neurologic'
  | 'Infectious'
  | 'Metabolic / endocrine'
  | 'Renal / GU'
  | 'Musculoskeletal'
  | 'Toxicologic'
  | 'OB / GYN'
  | 'Psych / behavioral'
  | 'Other'

type ChiefComplaint = {
  id: string
  label: string
  stem: string
  pearl: string
  expectedCategories: DiagnosisCategory[]
  cannotMiss: string[]
  sampleResponses: string[]
}

type ResponseEntry = {
  id: string
  learnerId: string
  text: string
  createdAt: string
}

type StoredSession = {
  level: LearnerLevel
  complaintId: string
  responses: ResponseEntry[]
  secondsRemaining: number
}

const STORAGE_KEY = 'microskills-ddx-whiteboard-v1'
const SESSION_LENGTH_SECONDS = 4 * 60

const chiefComplaints: ChiefComplaint[] = [
  {
    id: 'chest-pain',
    label: 'Chest pain',
    stem: 'A patient presents with chest pain.',
    pearl:
      'Separate the common from the lethal before adding details: ACS, PE, aortic catastrophe, pneumothorax, and esophageal rupture should be considered early.',
    expectedCategories: [
      'Cardiovascular',
      'Pulmonary',
      'GI / hepatobiliary',
      'Musculoskeletal',
      'Psych / behavioral',
    ],
    cannotMiss: [
      'Acute coronary syndrome',
      'Pulmonary embolism',
      'Aortic dissection',
      'Tension pneumothorax',
      'Esophageal rupture',
    ],
    sampleResponses: [
      'ACS, PE, pneumonia, GERD, costochondritis',
      'Aortic dissection, pericarditis, pneumothorax, anxiety',
      'MI, myocarditis, pancreatitis, esophageal rupture',
    ],
  },
  {
    id: 'dyspnea',
    label: 'Shortness of breath',
    stem: 'A patient presents with shortness of breath.',
    pearl:
      'Dyspnea becomes safer when learners name oxygenation, ventilation, circulation, and metabolic causes before anchoring on asthma or anxiety.',
    expectedCategories: [
      'Pulmonary',
      'Cardiovascular',
      'Infectious',
      'Metabolic / endocrine',
      'Toxicologic',
      'Psych / behavioral',
    ],
    cannotMiss: [
      'Pulmonary embolism',
      'Acute coronary syndrome',
      'Pneumothorax',
      'Sepsis',
      'Anaphylaxis',
    ],
    sampleResponses: [
      'Asthma, COPD, CHF, PE, pneumonia',
      'ACS, pneumothorax, sepsis, anemia',
      'Anaphylaxis, panic attack, DKA, toxic inhalation',
    ],
  },
  {
    id: 'abdominal-pain',
    label: 'Abdominal pain',
    stem: 'A patient presents with abdominal pain.',
    pearl:
      'Abdominal pain rewards a wide first pass: vascular, surgical, infectious, GU, metabolic, and reproductive diagnoses all deserve room.',
    expectedCategories: [
      'GI / hepatobiliary',
      'Cardiovascular',
      'Infectious',
      'Renal / GU',
      'Metabolic / endocrine',
      'OB / GYN',
    ],
    cannotMiss: [
      'AAA rupture',
      'Mesenteric ischemia',
      'Ectopic pregnancy',
      'Appendicitis',
      'Bowel obstruction',
    ],
    sampleResponses: [
      'Appendicitis, cholecystitis, pancreatitis, gastroenteritis',
      'AAA, mesenteric ischemia, bowel obstruction, perforated ulcer',
      'Ectopic pregnancy, ovarian torsion, kidney stone, DKA',
    ],
  },
  {
    id: 'headache',
    label: 'Headache',
    stem: 'A patient presents with headache.',
    pearl:
      'The first move is not migraine versus tension. The first move is deciding whether this headache could represent blood, infection, pressure, vascular injury, or toxin.',
    expectedCategories: [
      'Neurologic',
      'Infectious',
      'Cardiovascular',
      'Toxicologic',
      'Other',
    ],
    cannotMiss: [
      'Subarachnoid hemorrhage',
      'Meningitis',
      'Intracranial mass',
      'Cerebral venous sinus thrombosis',
      'Carbon monoxide poisoning',
    ],
    sampleResponses: [
      'Migraine, tension headache, SAH, meningitis',
      'Intracranial mass, stroke, temporal arteritis, CO poisoning',
      'Hypertensive emergency, venous sinus thrombosis, sinusitis',
    ],
  },
  {
    id: 'syncope',
    label: 'Syncope',
    stem: 'A patient presents after passing out.',
    pearl:
      'Syncope should trigger a search for rhythm, pump, blood, brain, and toxin problems before accepting a benign explanation.',
    expectedCategories: [
      'Cardiovascular',
      'Neurologic',
      'Metabolic / endocrine',
      'Toxicologic',
      'GI / hepatobiliary',
    ],
    cannotMiss: [
      'Dysrhythmia',
      'Pulmonary embolism',
      'GI bleed',
      'Aortic stenosis',
      'Seizure',
    ],
    sampleResponses: [
      'Vasovagal syncope, orthostasis, dysrhythmia, PE',
      'GI bleed, seizure, hypoglycemia, intoxication',
      'Aortic stenosis, ACS, dehydration, ectopic pregnancy',
    ],
  },
]

const categoryKeywords: Record<DiagnosisCategory, string[]> = {
  Cardiovascular: [
    'acs',
    'mi',
    'coronary',
    'dissection',
    'aortic',
    'aaa',
    'pericarditis',
    'myocarditis',
    'chf',
    'heart failure',
    'dysrhythmia',
    'arrhythmia',
    'stenosis',
    'hypertensive',
  ],
  Pulmonary: [
    'pe',
    'pulmonary embol',
    'pneumothorax',
    'asthma',
    'copd',
    'pneumonia',
    'anaphylaxis',
    'respiratory',
  ],
  'GI / hepatobiliary': [
    'gerd',
    'esophageal',
    'rupture',
    'pancreatitis',
    'appendicitis',
    'cholecystitis',
    'gastroenteritis',
    'bowel',
    'perforated',
    'ulcer',
    'mesenteric',
    'bleed',
  ],
  Neurologic: [
    'sah',
    'subarachnoid',
    'stroke',
    'seizure',
    'migraine',
    'tension headache',
    'mass',
    'venous sinus',
    'intracranial',
  ],
  Infectious: ['sepsis', 'meningitis', 'pneumonia', 'infection', 'sinusitis', 'gastroenteritis'],
  'Metabolic / endocrine': ['dka', 'hypoglycemia', 'anemia', 'metabolic', 'thyroid'],
  'Renal / GU': ['kidney stone', 'pyelo', 'renal', 'urinary', 'uti', 'torsion'],
  Musculoskeletal: ['costochondritis', 'muscle', 'rib', 'strain', 'fracture'],
  Toxicologic: ['co poisoning', 'carbon monoxide', 'toxic', 'intoxication', 'overdose', 'inhalation'],
  'OB / GYN': ['ectopic', 'pregnancy', 'ovarian', 'torsion'],
  'Psych / behavioral': ['anxiety', 'panic', 'psych'],
  Other: ['temporal arteritis', 'sinusitis', 'dehydration'],
}

const levelGuidance: Record<LearnerLevel, string> = {
  M1: 'List plausible causes and make sure at least one life threat appears.',
  M2: 'Group causes by system or mechanism before deciding what is most likely.',
  M3: 'Prioritize likely versus dangerous diagnoses and be ready to justify the first action.',
}

const normalize = (value: string) => value.trim().toLowerCase()

const includesDiagnosis = (responseText: string, diagnosis: string) => {
  const source = normalize(responseText)
  const target = normalize(diagnosis)

  if (source.includes(target)) {
    return true
  }

  const aliasMap: Record<string, string[]> = {
    'acute coronary syndrome': ['acs', 'mi', 'myocardial infarction', 'heart attack'],
    'pulmonary embolism': ['pe'],
    'aortic dissection': ['dissection'],
    'tension pneumothorax': ['pneumothorax', 'ptx'],
    'esophageal rupture': ['boerhaave', 'rupture'],
    sepsis: ['septic'],
    anaphylaxis: ['allergic reaction'],
    'aaa rupture': ['aaa', 'ruptured aneurysm', 'abdominal aortic aneurysm'],
    'mesenteric ischemia': ['ischemic bowel'],
    'ectopic pregnancy': ['ectopic'],
    'bowel obstruction': ['sbo', 'obstruction'],
    'subarachnoid hemorrhage': ['sah', 'brain bleed'],
    meningitis: ['meningitis'],
    'intracranial mass': ['mass', 'tumor'],
    'cerebral venous sinus thrombosis': ['cvst', 'venous sinus'],
    'carbon monoxide poisoning': ['co poisoning', 'carbon monoxide'],
    dysrhythmia: ['arrhythmia'],
    'gi bleed': ['gib', 'bleed'],
    'aortic stenosis': ['stenosis'],
  }

  return aliasMap[target]?.some((alias) => source.includes(alias)) ?? false
}

const categorizeResponse = (text: string) => {
  const source = normalize(text)
  const categories = Object.entries(categoryKeywords)
    .filter(([, keywords]) => keywords.some((keyword) => source.includes(keyword)))
    .map(([category]) => category as DiagnosisCategory)

  return categories.length > 0 ? categories : (['Other'] as DiagnosisCategory[])
}

const createLearnerId = (index: number) =>
  `Learner ${String(1000 + index * 37 + 14).slice(-4)}`

const createResponse = (text: string, index: number): ResponseEntry => ({
  id: crypto.randomUUID(),
  learnerId: createLearnerId(index),
  text,
  createdAt: new Date().toISOString(),
})

const getStoredSession = (): StoredSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

function App() {
  const storedSession = getStoredSession()
  const [level, setLevel] = useState<LearnerLevel>(storedSession?.level ?? 'M3')
  const [complaintId, setComplaintId] = useState(
    storedSession?.complaintId ?? chiefComplaints[0].id,
  )
  const [responses, setResponses] = useState<ResponseEntry[]>(storedSession?.responses ?? [])
  const [draftResponse, setDraftResponse] = useState('')
  const [secondsRemaining, setSecondsRemaining] = useState(
    storedSession?.secondsRemaining ?? SESSION_LENGTH_SECONDS,
  )
  const [timerRunning, setTimerRunning] = useState(false)

  const complaint =
    chiefComplaints.find((item) => item.id === complaintId) ?? chiefComplaints[0]

  useEffect(() => {
    const session: StoredSession = {
      level,
      complaintId,
      responses,
      secondsRemaining,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }, [complaintId, level, responses, secondsRemaining])

  useEffect(() => {
    if (!timerRunning || secondsRemaining <= 0) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [secondsRemaining, timerRunning])

  const aggregate = useMemo(() => {
    const mentionedCategories = new Set<DiagnosisCategory>()
    responses.forEach((response) => {
      categorizeResponse(response.text).forEach((category) => mentionedCategories.add(category))
    })

    const dangerMentioned = complaint.cannotMiss.filter((diagnosis) =>
      responses.some((response) => includesDiagnosis(response.text, diagnosis)),
    )
    const dangerMissing = complaint.cannotMiss.filter(
      (diagnosis) => !dangerMentioned.includes(diagnosis),
    )

    return {
      mentionedCategories: Array.from(mentionedCategories),
      expectedMissing: complaint.expectedCategories.filter(
        (category) => !mentionedCategories.has(category),
      ),
      dangerMentioned,
      dangerMissing,
    }
  }, [complaint, responses])

  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = String(secondsRemaining % 60).padStart(2, '0')

  const addResponse = (text: string) => {
    const cleanText = text.trim()
    if (!cleanText) {
      return
    }
    setResponses((current) => [...current, createResponse(cleanText, current.length + 1)])
    setDraftResponse('')
  }

  const addSampleResponse = () => {
    const usedTexts = new Set(responses.map((response) => response.text))
    const sample =
      complaint.sampleResponses.find((response) => !usedTexts.has(response)) ??
      complaint.sampleResponses[responses.length % complaint.sampleResponses.length]
    addResponse(sample)
  }

  const chooseRandomComplaint = () => {
    const nextOptions = chiefComplaints.filter((item) => item.id !== complaintId)
    const next = nextOptions[Math.floor(Math.random() * nextOptions.length)]
    setComplaintId(next.id)
    setResponses([])
    setSecondsRemaining(SESSION_LENGTH_SECONDS)
    setTimerRunning(false)
  }

  const resetSession = () => {
    setResponses([])
    setDraftResponse('')
    setSecondsRemaining(SESSION_LENGTH_SECONDS)
    setTimerRunning(false)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Rapid Microskills for Clinical Reasoning</p>
          <h1>Low-Information DDx Whiteboard</h1>
        </div>
        <div className="privacy-badge">
          <span>Browser-only</span>
          <strong>No PHI. No names. Formative only.</strong>
        </div>
      </header>

      <section className="control-band" aria-label="Session controls">
        <label>
          Learner level
          <select value={level} onChange={(event) => setLevel(event.target.value as LearnerLevel)}>
            <option value="M1">M1 - list causes</option>
            <option value="M2">M2 - group mechanisms</option>
            <option value="M3">M3 - prioritize risk</option>
          </select>
        </label>

        <label>
          Chief complaint
          <select
            value={complaintId}
            onChange={(event) => {
              setComplaintId(event.target.value)
              setResponses([])
              setSecondsRemaining(SESSION_LENGTH_SECONDS)
              setTimerRunning(false)
            }}
          >
            {chiefComplaints.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={chooseRandomComplaint}>
          Generate prompt
        </button>
        <button type="button" className="secondary" onClick={resetSession}>
          Reset session
        </button>
      </section>

      <section className="prompt-board">
        <div>
          <p className="section-label">Prompt</p>
          <h2>{complaint.stem}</h2>
          <p>{levelGuidance[level]}</p>
        </div>
        <div className="timer-card" aria-live="polite">
          <span>{`${minutes}:${seconds}`}</span>
          <div className="timer-actions">
            <button type="button" onClick={() => setTimerRunning((current) => !current)}>
              {timerRunning ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setSecondsRemaining(SESSION_LENGTH_SECONDS)
                setTimerRunning(false)
              }}
            >
              4 min
            </button>
          </div>
        </div>
      </section>

      <div className="workspace-grid">
        <section className="panel response-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Simulated student input</p>
              <h2>Anonymous DDx submissions</h2>
            </div>
            <span>{responses.length} submitted</span>
          </div>
          <textarea
            value={draftResponse}
            onChange={(event) => setDraftResponse(event.target.value)}
            placeholder="ACS, PE, pneumonia, GERD..."
            rows={4}
          />
          <div className="button-row">
            <button type="button" onClick={() => addResponse(draftResponse)}>
              Add response
            </button>
            <button type="button" className="secondary" onClick={addSampleResponse}>
              Add sample
            </button>
          </div>
          <p className="helper-copy">
            Demo responses use random learner IDs and stay in this browser. A real pilot would rotate
            IDs unless IRB approves longitudinal tracking.
          </p>
        </section>

        <section className="panel whiteboard-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Whiteboard</p>
              <h2>What the room generated</h2>
            </div>
          </div>
          {responses.length === 0 ? (
            <div className="empty-state">
              Add a sample response to show how the aggregate assistant organizes the room.
            </div>
          ) : (
            <div className="response-list">
              {responses.map((response) => (
                <article key={response.id} className="response-card">
                  <div>
                    <strong>{response.learnerId}</strong>
                    <span>{categorizeResponse(response.text).join(' + ')}</span>
                  </div>
                  <p>{response.text}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel assistant-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Aggregate assistant</p>
              <h2>Instructor-facing synthesis</h2>
            </div>
          </div>

          <div className="metric-grid">
            <div>
              <strong>{aggregate.mentionedCategories.length}</strong>
              <span>categories represented</span>
            </div>
            <div>
              <strong>{aggregate.dangerMentioned.length}</strong>
              <span>can&apos;t-miss diagnoses named</span>
            </div>
          </div>

          <div className="assistant-section">
            <h3>Categories named</h3>
            <div className="chip-list">
              {aggregate.mentionedCategories.length > 0 ? (
                aggregate.mentionedCategories.map((category) => (
                  <span key={category} className="chip">
                    {category}
                  </span>
                ))
              ) : (
                <span className="muted">Waiting for responses</span>
              )}
            </div>
          </div>

          <div className="assistant-section">
            <h3>Can&apos;t-miss coverage</h3>
            <div className="split-list">
              <div>
                <span className="mini-label">Mentioned</span>
                {aggregate.dangerMentioned.length > 0 ? (
                  aggregate.dangerMentioned.map((diagnosis) => (
                    <p key={diagnosis} className="positive">
                      {diagnosis}
                    </p>
                  ))
                ) : (
                  <p className="muted">None yet</p>
                )}
              </div>
              <div>
                <span className="mini-label">Worth probing</span>
                {aggregate.dangerMissing.slice(0, 3).map((diagnosis) => (
                  <p key={diagnosis} className="warning">
                    {diagnosis}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="teaching-pearl">
            <span>One-minute pearl</span>
            <p>{complaint.pearl}</p>
          </div>

          <p className="helper-copy">
            This deterministic demo models the planned SLM role: aggregate pattern finding for the
            instructor, never student grading.
          </p>
        </section>
      </div>
    </main>
  )
}

export default App
