interface JobRequirement {
  skills: string[];
  experience: number;
  education: string;
  certifications?: string[];
  domain?: string;
}

interface ResumeEntity {
  skills: string[];
  experience: { title: string; company: string; duration: number }[];
  education: { degree: string; school: string; year: number }[];
  certifications: string[];
  jobTitles: string[];
}

interface MatchResult {
  overallScore: number;
  skillMatch: { name: string; score: number; required: boolean }[];
  experienceMatch: number;
  educationMatch: boolean;
  gapAnalysis: string[];
  recommendedQuestions: string[];
}

interface SkillMapping {
  skill: string;
  variants: string[];
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

const skillTaxonomy: SkillMapping[] = [
  { skill: 'javascript', variants: ['js', 'ecmascript'], category: 'Language', level: 'intermediate' },
  { skill: 'typescript', variants: ['ts'], category: 'Language', level: 'intermediate' },
  { skill: 'python', variants: ['py'], category: 'Language', level: 'intermediate' },
  { skill: 'java', variants: [], category: 'Language', level: 'intermediate' },
  { skill: 'react', variants: ['reactjs', 'react.js'], category: 'Framework', level: 'intermediate' },
  { skill: 'node', variants: ['nodejs', 'node.js'], category: 'Framework', level: 'intermediate' },
  { skill: 'angular', variants: ['angularjs', 'angular.js'], category: 'Framework', level: 'advanced' },
  { skill: 'vue', variants: ['vuejs', 'vue.js'], category: 'Framework', level: 'intermediate' },
  { skill: 'sql', variants: ['mysql', 'postgresql', 'postgres'], category: 'Database', level: 'intermediate' },
  { skill: 'nosql', variants: ['mongodb', 'dynamodb', 'cassandra'], category: 'Database', level: 'intermediate' },
  { skill: 'aws', variants: ['amazon web services', 'amazon aws'], category: 'Cloud', level: 'advanced' },
  { skill: 'azure', variants: ['microsoft azure'], category: 'Cloud', level: 'advanced' },
  { skill: 'gcp', variants: ['google cloud', 'google cloud platform'], category: 'Cloud', level: 'advanced' },
  { skill: 'docker', variants: ['containerization'], category: 'DevOps', level: 'intermediate' },
  { skill: 'kubernetes', variants: ['k8s', 'kubes'], category: 'DevOps', level: 'advanced' },
  { skill: 'api', variants: ['rest api', 'restful', 'graphql'], category: 'Architecture', level: 'intermediate' },
  { skill: 'microservices', variants: ['microservice'], category: 'Architecture', level: 'advanced' },
  { skill: 'agile', variants: ['scrum', 'kanban'], category: 'Methodology', level: 'intermediate' },
  { skill: 'machine learning', variants: ['ml', 'ai'], category: 'Data Science', level: 'expert' },
  { skill: 'data analysis', variants: ['analytics', 'data science'], category: 'Data Science', level: 'intermediate' }
];

function normalizeSkill(skill: string): string {
  const lower = skill.toLowerCase().trim();
  const mapped = skillTaxonomy.find(s => 
    s.skill === lower || s.variants.includes(lower)
  );
  return mapped?.skill || lower;
}

function calculateSkillMatch(resumeSkills: string[], jobSkills: string[]): { name: string; score: number; required: boolean }[] {
  const resumeNormalized = resumeSkills.map(normalizeSkill);
  const jobNormalized = jobSkills.map(normalizeSkill);

  return jobNormalized.map(jobSkill => {
    const exactMatch = resumeNormalized.find(r => r === jobSkill);
    const partialMatch = resumeNormalized.find(r => r.includes(jobSkill) || jobSkill.includes(r));
    
    let score = 0;
    if (exactMatch) score = 100;
    else if (partialMatch) score = 70;

    return {
      name: jobSkill,
      score,
      required: true
    };
  });
}

function calculateExperienceMatch(
  resume: ResumeEntity,
  requirement: JobRequirement
): number {
  const totalExp = resume.experience.reduce((acc, exp) => acc + exp.duration, 0);
  const requiredExp = requirement.experience;

  if (totalExp >= requiredExp) return 100;
  if (totalExp === 0) return 0;
  
  return Math.round((totalExp / requiredExp) * 100);
}

function checkEducationMatch(resume: ResumeEntity, requirement: JobRequirement): boolean {
  const resumeDegrees = resume.education.map(e => e.degree.toLowerCase());
  const requiredDegree = requirement.education.toLowerCase();

  const degreeLevels = ['high school', 'associate', 'bachelor', 'master', 'phd', 'doctorate'];
  const resumeLevel = Math.max(...resumeDegrees.map(d => {
    const idx = degreeLevels.findIndex(l => d.includes(l));
    return idx >= 0 ? idx : 0;
  }));
  const requiredLevel = degreeLevels.findIndex(l => requiredDegree.includes(l));

  return resumeLevel >= requiredLevel;
}

function analyzeSkillGaps(jobSkills: string[], resumeSkills: string[]): string[] {
  const gaps: string[] = [];
  const resumeNormalized = resumeSkills.map(normalizeSkill);

  jobSkills.forEach(jobSkill => {
    const hasSkill = resumeNormalized.some(r => 
      r === jobSkill || r.includes(jobSkill) || jobSkill.includes(r)
    );
    if (!hasSkill) {
      const mapping = skillTaxonomy.find(s => s.skill === jobSkill);
      gaps.push(`Missing skill: ${jobSkill} (${mapping?.category || 'General'})`);
    }
  });

  return gaps;
}

function generateRecommendedQuestions(skillGaps: string[], experienceMatch: number): string[] {
  const questions: string[] = [];

  if (experienceMatch < 100) {
    questions.push('Can you describe how you would handle a project requiring more experience than you currently have?');
  }

  skillGaps.forEach(gap => {
    const skill = gap.replace('Missing skill: ', '').split(' (')[0];
    questions.push(`What is your experience with ${skill}?`);
    questions.push(`How would you approach learning ${skill} if hired?`);
  });

  return questions.slice(0, 5);
}

export function matchResumeToJob(
  resume: ResumeEntity,
  requirement: JobRequirement
): MatchResult {
  const skillMatches = calculateSkillMatch(resume.skills, requirement.skills);
  const matchedSkills = skillMatches.filter(s => s.score > 0);
  const skillScore = matchedSkills.length > 0 
    ? Math.round((matchedSkills.reduce((acc, s) => acc + s.score, 0) / skillMatches.length))
    : 0;

  const experienceMatch = calculateExperienceMatch(resume, requirement);
  const educationMatch = checkEducationMatch(resume, requirement);
  const gapAnalysis = analyzeSkillGaps(requirement.skills, resume.skills);
  const recommendedQuestions = generateRecommendedQuestions(gapAnalysis, experienceMatch);

  const skillWeight = 0.4;
  const experienceWeight = 0.35;
  const educationWeight = 0.15;
  const gapWeight = 0.1;

  const gapScore = Math.max(0, 100 - gapAnalysis.length * 15);
  const overallScore = Math.round(
    skillScore * skillWeight +
    experienceMatch * experienceWeight +
    (educationMatch ? 100 : 50) * educationWeight +
    gapScore * gapWeight
  );

  return {
    overallScore,
    skillMatch: skillMatches,
    experienceMatch,
    educationMatch,
    gapAnalysis,
    recommendedQuestions
  };
}

export function extractResumeEntities(resumeText: string): ResumeEntity {
  const text = resumeText.toLowerCase();

  const skillPatterns = [
    'javascript', 'typescript', 'python', 'java', 'react', 'node', 'angular', 'vue',
    'sql', 'mongodb', 'postgresql', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
    'api', 'graphql', 'rest', 'microservices', 'agile', 'scrum', 'machine learning',
    'html', 'css', 'sass', 'less', 'redux', 'nextjs', 'express', 'django', 'flask'
  ];
  const skills = skillPatterns.filter(s => text.includes(s));

  const jobTitlePatterns = [
    'software engineer', 'senior engineer', 'lead', 'manager', 'developer', 'architect',
    'analyst', 'consultant', 'designer', 'product manager', 'tech lead', 'devops'
  ];
  const jobTitles = jobTitlePatterns.filter(p => text.includes(p));

  const educationPatterns = [
    'bachelor', 'master', 'phd', 'bs', 'ms', 'mba', 'bsc', 'msc', 'degree'
  ];
  const hasDegree = educationPatterns.some(p => text.includes(p));

  return {
    skills,
    experience: [],
    education: hasDegree ? [{ degree: 'Bachelor', school: 'Unknown', year: 2020 }] : [],
    certifications: [],
    jobTitles
  };
}