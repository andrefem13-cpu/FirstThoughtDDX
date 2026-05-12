import { useEffect, useMemo, useState } from 'react'
import './App.css'

type LearnerLevel = 'M1' | 'M2' | 'M3' | 'M4'

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

type CaseInfoKey = 'demographics' | 'symptomDetails' | 'history' | 'medications' | 'riskFactors'

type TeachingCase = {
  id: string
  label: string
  complaint: string
  learnerQuestion: string
  info: Record<CaseInfoKey, string>
  expectedCategories: DiagnosisCategory[]
  cannotMiss: string[]
  importantMisses: string[]
  pearl: string
  sampleResponses: string[]
}

type LevelConfig = {
  label: string
  shortLabel: string
  task: string
  visibleInfo: CaseInfoKey[]
  debriefFocus: string
  placeholder: string
}

type ResponseEntry = {
  id: string
  learnerId: string
  text: string
  createdAt: string
}

type StoredSession = {
  level: LearnerLevel
  caseId: string
  responses: ResponseEntry[]
  secondsRemaining: number
}

const STORAGE_KEY = 'first-thought-ddx-session-v2'
const SESSION_LENGTH_SECONDS = 4 * 60

const infoLabels: Record<CaseInfoKey, string> = {
  demographics: 'Patient',
  symptomDetails: 'Symptom details',
  history: 'Medical history',
  medications: 'Current meds',
  riskFactors: 'Risk factors',
}

const levelConfig: Record<LearnerLevel, LevelConfig> = {
  M1: {
    label: 'M1 - cold open',
    shortLabel: 'M1',
    task: 'Generate a broad differential from the chief complaint alone. Include at least one life threat.',
    visibleInfo: [],
    debriefFocus: 'Can the room name plausible causes without getting overwhelmed by case detail?',
    placeholder: 'ACS, PE, pneumonia, GERD, costochondritis...',
  },
  M2: {
    label: 'M2 - organize',
    shortLabel: 'M2',
    task: 'Use the chief complaint plus basic patient context. Group causes by system or mechanism.',
    visibleInfo: ['demographics'],
    debriefFocus: 'Can learners move from a list to categories without anchoring too early?',
    placeholder: 'Cardiac: ACS, myocarditis. Pulm: PE, pneumonia. GI: GERD...',
  },
  M3: {
    label: 'M3 - prioritize',
    shortLabel: 'M3',
    task: 'Add symptom details and past history. Prioritize most likely versus most dangerous.',
    visibleInfo: ['demographics', 'symptomDetails', 'history'],
    debriefFocus: 'Can learners separate likelihood from lethality and explain their first branch point?',
    placeholder: 'Most dangerous: PE, ACS. Most likely: pneumonia, asthma. Need ECG/CXR...',
  },
  M4: {
    label: 'M4 - synthesize',
    shortLabel: 'M4',
    task: 'Use the fuller case frame. Build a prioritized DDx with a first action or disposition concern.',
    visibleInfo: ['demographics', 'symptomDetails', 'history', 'medications', 'riskFactors'],
    debriefFocus: 'Can learners synthesize risk, meds, context, and first action without losing breadth?',
    placeholder: '1. PE - risk factors and pleuritic pain, cannot miss. 2. ACS - ECG/troponin...',
  },
}

const teachingCases: TeachingCase[] = [
  {
    id: 'chest-pain',
    label: 'Chest pain',
    complaint: 'A patient presents with chest pain.',
    learnerQuestion: 'What belongs on the first-pass differential?',
    info: {
      demographics: '54-year-old man',
      symptomDetails: 'Pressure-like discomfort for 45 minutes, radiating to the left shoulder, with diaphoresis.',
      history: 'Hypertension, type 2 diabetes, GERD.',
      medications: 'Metformin, lisinopril, omeprazole.',
      riskFactors: 'Smokes one pack per day. Father had an MI at 58.',
    },
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
    importantMisses: ['Pericarditis', 'Myocarditis', 'Pneumonia'],
    pearl:
      'Chest pain gets safer when learners name the lethal diagnoses before they argue about the most likely one.',
    sampleResponses: [
      'ACS, PE, pneumonia, GERD, costochondritis',
      'Aortic dissection, pericarditis, pneumothorax, anxiety',
      'MI, myocarditis, pancreatitis, esophageal rupture',
    ],
  },
  {
    id: 'dyspnea',
    label: 'Shortness of breath',
    complaint: 'A patient presents with shortness of breath.',
    learnerQuestion: 'What systems could be causing this patient to feel dyspneic?',
    info: {
      demographics: '68-year-old woman',
      symptomDetails: 'Worsening dyspnea for 2 days with pleuritic discomfort and mild cough.',
      history: 'COPD, heart failure with preserved EF, recent knee replacement.',
      medications: 'Albuterol, tiotropium, furosemide, apixaban held for surgery.',
      riskFactors: 'Recent immobility, former smoker, baseline exertional dyspnea.',
    },
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
    importantMisses: ['Heart failure', 'COPD exacerbation', 'Anemia'],
    pearl:
      'Dyspnea should trigger oxygenation, ventilation, circulation, and metabolic thinking before settling on asthma or anxiety.',
    sampleResponses: [
      'Asthma, COPD, CHF, PE, pneumonia',
      'ACS, pneumothorax, sepsis, anemia',
      'Anaphylaxis, panic attack, DKA, toxic inhalation',
    ],
  },
  {
    id: 'abdominal-pain',
    label: 'Abdominal pain',
    complaint: 'A patient presents with abdominal pain.',
    learnerQuestion: 'What dangerous and common diagnoses should be on the board early?',
    info: {
      demographics: '27-year-old woman',
      symptomDetails: 'Sharp right lower quadrant pain since this morning with nausea and one episode of emesis.',
      history: 'No prior surgeries. Last menstrual period 7 weeks ago.',
      medications: 'Prenatal vitamin as needed. No anticoagulants.',
      riskFactors: 'Sexually active, no reliable contraception, no established prenatal care.',
    },
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
    importantMisses: ['Ovarian torsion', 'PID', 'Pyelonephritis'],
    pearl:
      'Abdominal pain rewards a wide first pass: vascular, surgical, infectious, GU, metabolic, and reproductive diagnoses all deserve room.',
    sampleResponses: [
      'Appendicitis, cholecystitis, pancreatitis, gastroenteritis',
      'AAA, mesenteric ischemia, bowel obstruction, perforated ulcer',
      'Ectopic pregnancy, ovarian torsion, kidney stone, DKA',
    ],
  },
  {
    id: 'headache',
    label: 'Headache',
    complaint: 'A patient presents with headache.',
    learnerQuestion: 'What makes this headache dangerous until proven otherwise?',
    info: {
      demographics: '35-year-old man',
      symptomDetails: 'Abrupt severe headache during exercise, maximal within minutes, with vomiting.',
      history: 'Migraines in college, no recent trauma.',
      medications: 'No daily medications.',
      riskFactors: 'Family history of aneurysm. Uses cocaine occasionally.',
    },
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
    importantMisses: ['Hypertensive emergency', 'Cervical artery dissection', 'Temporal arteritis'],
    pearl:
      'The first move is not migraine versus tension. The first move is deciding whether this could be blood, infection, pressure, vascular injury, or toxin.',
    sampleResponses: [
      'Migraine, tension headache, SAH, meningitis',
      'Intracranial mass, stroke, temporal arteritis, CO poisoning',
      'Hypertensive emergency, venous sinus thrombosis, sinusitis',
    ],
  },
  {
    id: 'syncope',
    label: 'Syncope',
    complaint: 'A patient presents after passing out.',
    learnerQuestion: 'Which diagnoses change disposition even if the patient now looks well?',
    info: {
      demographics: '72-year-old man',
      symptomDetails: 'Brief loss of consciousness while walking upstairs, now alert with mild shortness of breath.',
      history: 'Aortic stenosis, atrial fibrillation, chronic kidney disease.',
      medications: 'Metoprolol, warfarin, torsemide.',
      riskFactors: 'No prodrome, exertional episode, anticoagulated, lives alone.',
    },
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
    importantMisses: ['Hypoglycemia', 'Orthostasis', 'Intracranial hemorrhage'],
    pearl:
      'Syncope should trigger a search for rhythm, pump, blood, brain, and toxin problems before accepting a benign explanation.',
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
    'gib',
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
    'dissection',
  ],
  Infectious: ['sepsis', 'meningitis', 'pneumonia', 'infection', 'sinusitis', 'gastroenteritis', 'pid'],
  'Metabolic / endocrine': ['dka', 'hypoglycemia', 'anemia', 'metabolic', 'thyroid'],
  'Renal / GU': ['kidney stone', 'pyelo', 'pyelonephritis', 'renal', 'urinary', 'uti', 'torsion'],
  Musculoskeletal: ['costochondritis', 'muscle', 'rib', 'strain', 'fracture'],
  Toxicologic: ['co poisoning', 'carbon monoxide', 'toxic', 'intoxication', 'overdose', 'inhalation', 'cocaine'],
  'OB / GYN': ['ectopic', 'pregnancy', 'ovarian', 'torsion', 'pid'],
  'Psych / behavioral': ['anxiety', 'panic', 'psych'],
  Other: ['temporal arteritis', 'sinusitis', 'dehydration'],
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
  const storedSession = useMemo(() => getStoredSession(), [])
  const [level, setLevel] = useState<LearnerLevel>(storedSession?.level ?? 'M1')
  const [caseId, setCaseId] = useState(storedSession?.caseId ?? teachingCases[0].id)
  const [responses, setResponses] = useState<ResponseEntry[]>(storedSession?.responses ?? [])
  const [draftResponse, setDraftResponse] = useState('')
  const [secondsRemaining, setSecondsRemaining] = useState(
    storedSession?.secondsRemaining ?? SESSION_LENGTH_SECONDS,
  )
  const [timerRunning, setTimerRunning] = useState(false)

  const teachingCase = useMemo(
    () => teachingCases.find((item) => item.id === caseId) ?? teachingCases[0],
    [caseId],
  )
  const activeLevel = levelConfig[level]
  const visibleInfo = activeLevel.visibleInfo.map((key) => ({
    key,
    label: infoLabels[key],
    value: teachingCase.info[key],
  }))

  useEffect(() => {
    const session: StoredSession = {
      level,
      caseId,
      responses,
      secondsRemaining,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }, [caseId, level, responses, secondsRemaining])

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

    const dangerMentioned = teachingCase.cannotMiss.filter((diagnosis) =>
      responses.some((response) => includesDiagnosis(response.text, diagnosis)),
    )
    const dangerMissing = teachingCase.cannotMiss.filter(
      (diagnosis) => !dangerMentioned.includes(diagnosis),
    )
    const importantMisses = teachingCase.importantMisses.filter(
      (diagnosis) => !responses.some((response) => includesDiagnosis(response.text, diagnosis)),
    )
    const expectedMissing = teachingCase.expectedCategories.filter(
      (category) => !mentionedCategories.has(category),
    )

    return {
      mentionedCategories: Array.from(mentionedCategories),
      expectedMissing,
      dangerMentioned,
      dangerMissing,
      importantMisses,
      safetyCoverage: Math.round((dangerMentioned.length / teachingCase.cannotMiss.length) * 100),
    }
  }, [responses, teachingCase])

  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = String(secondsRemaining % 60).padStart(2, '0')

  const setCaseAndClear = (nextCaseId: string) => {
    setCaseId(nextCaseId)
    setResponses([])
    setDraftResponse('')
    setSecondsRemaining(SESSION_LENGTH_SECONDS)
    setTimerRunning(false)
  }

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
      teachingCase.sampleResponses.find((response) => !usedTexts.has(response)) ??
      teachingCase.sampleResponses[responses.length % teachingCase.sampleResponses.length]
    addResponse(sample)
  }

  const chooseRandomCase = () => {
    const nextOptions = teachingCases.filter((item) => item.id !== caseId)
    const next = nextOptions[Math.floor(Math.random() * nextOptions.length)]
    setCaseAndClear(next.id)
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
          <h1>First Thought DDx</h1>
          <p className="subtitle">
            A four-minute, low-information differential whiteboard for formative teaching.
          </p>
        </div>
        <div className="privacy-badge">
          <span>Clinician in the loop</span>
          <strong>No PHI. No names. Aggregate patterns only.</strong>
        </div>
      </header>

      <section className="control-band" aria-label="Session controls">
        <label>
          Learner level
          <select value={level} onChange={(event) => setLevel(event.target.value as LearnerLevel)}>
            {Object.entries(levelConfig).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Synthetic case
          <select value={caseId} onChange={(event) => setCaseAndClear(event.target.value)}>
            {teachingCases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={chooseRandomCase}>
          Random case
        </button>
        <button type="button" className="secondary" onClick={resetSession}>
          Reset
        </button>
      </section>

      <section className="prompt-board">
        <div className="prompt-copy">
          <p className="section-label">Cold open</p>
          <h2>{teachingCase.complaint}</h2>
          <p>{teachingCase.learnerQuestion}</p>
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

      <section className="level-band" aria-label="Level-specific learner view">
        <div>
          <p className="section-label">Visible learner information</p>
          <h2>{activeLevel.shortLabel} task</h2>
          <p>{activeLevel.task}</p>
        </div>

        {visibleInfo.length === 0 ? (
          <div className="info-card empty-info">
            Chief complaint only. The low-information discomfort is the point.
          </div>
        ) : (
          <div className="info-grid">
            {visibleInfo.map((item) => (
              <article key={item.key} className="info-card">
                <span>{item.label}</span>
                <p>{item.value}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="workspace-grid">
        <section className="panel response-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Student input</p>
              <h2>Anonymous DDx submissions</h2>
            </div>
            <span>{responses.length} reps</span>
          </div>
          <textarea
            value={draftResponse}
            onChange={(event) => setDraftResponse(event.target.value)}
            placeholder={activeLevel.placeholder}
            rows={5}
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
            This stays browser-only. A real pilot should rotate anonymous IDs unless leadership and
            IRB approve longitudinal tracking.
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
              Add a response or sample to populate the room-level differential.
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
            <div>
              <strong>{aggregate.safetyCoverage}%</strong>
              <span>safety coverage</span>
            </div>
            <div>
              <strong>{responses.length}</strong>
              <span>anonymous reps</span>
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
            <h3>Important misses to probe</h3>
            <div className="split-list">
              <div>
                <span className="mini-label">Can&apos;t miss</span>
                {aggregate.dangerMissing.slice(0, 3).map((diagnosis) => (
                  <p key={diagnosis} className="warning">
                    {diagnosis}
                  </p>
                ))}
                {aggregate.dangerMissing.length === 0 && <p className="positive">Covered</p>}
              </div>
              <div>
                <span className="mini-label">Categories</span>
                {aggregate.expectedMissing.slice(0, 3).map((category) => (
                  <p key={category} className="warning">
                    {category}
                  </p>
                ))}
                {aggregate.expectedMissing.length === 0 && <p className="positive">Broad pass</p>}
              </div>
            </div>
          </div>

          <div className="assistant-section">
            <h3>Secondary misses</h3>
            <div className="chip-list">
              {aggregate.importantMisses.slice(0, 4).map((diagnosis) => (
                <span key={diagnosis} className="chip quiet-chip">
                  {diagnosis}
                </span>
              ))}
            </div>
          </div>

          <div className="teaching-pearl">
            <span>One-minute pearl</span>
            <p>{teachingCase.pearl}</p>
          </div>

          <div className="debrief-card">
            <span>Faculty probe</span>
            <p>{activeLevel.debriefFocus}</p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
