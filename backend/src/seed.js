require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db');
const Major = require('./models/Major');
const Subject = require('./models/Subject');

const SEED_DATA = {
  'Computer Science': [
    { year: 1, semester: 1, subjects: ['Introduction to Programming', 'Discrete Mathematics', 'Linear Algebra I'] },
    { year: 1, semester: 2, subjects: ['Data Structures', 'Calculus I', 'Digital Logic Design'] },
    { year: 2, semester: 1, subjects: ['Algorithms', 'Operating Systems', 'Computer Architecture'] },
    { year: 2, semester: 2, subjects: ['Databases', 'Computer Networks', 'Software Engineering'] },
    { year: 3, semester: 1, subjects: ['Compilers', 'Artificial Intelligence', 'Theory of Computation'] },
    { year: 3, semester: 2, subjects: ['Machine Learning', 'Distributed Systems', 'Computer Graphics'] },
    { year: 4, semester: 1, subjects: ['Cloud Computing', 'Cybersecurity', 'Capstone Project I'] },
    { year: 4, semester: 2, subjects: ['Advanced Topics in CS', 'Capstone Project II'] },
  ],
  'Mathematics': [
    { year: 1, semester: 1, subjects: ['Calculus I', 'Linear Algebra I', 'Introduction to Proofs'] },
    { year: 1, semester: 2, subjects: ['Calculus II', 'Abstract Algebra I', 'Statistics'] },
    { year: 2, semester: 1, subjects: ['Real Analysis I', 'Complex Analysis', 'Number Theory'] },
    { year: 2, semester: 2, subjects: ['Real Analysis II', 'Differential Equations', 'Topology'] },
    { year: 3, semester: 1, subjects: ['Functional Analysis', 'Measure Theory', 'Combinatorics'] },
    { year: 3, semester: 2, subjects: ['Numerical Analysis', 'Probability Theory', 'Mathematical Logic'] },
    { year: 4, semester: 1, subjects: ['Differential Geometry', 'Partial Differential Equations'] },
    { year: 4, semester: 2, subjects: ['Advanced Seminar', 'Mathematics Thesis'] },
  ],
  'Mechanical Engineering': [
    { year: 1, semester: 1, subjects: ['Engineering Mechanics', 'Engineering Drawing', 'Calculus for Engineers'] },
    { year: 1, semester: 2, subjects: ['Thermodynamics I', 'Materials Science', 'Linear Algebra'] },
    { year: 2, semester: 1, subjects: ['Fluid Mechanics', 'Dynamics', 'Manufacturing Processes'] },
    { year: 2, semester: 2, subjects: ['Heat Transfer', 'Machine Design', 'Numerical Methods'] },
    { year: 3, semester: 1, subjects: ['Control Systems', 'Mechanical Vibrations', 'Finite Element Analysis'] },
    { year: 3, semester: 2, subjects: ['HVAC Systems', 'Robotics', 'Engineering Ethics'] },
    { year: 4, semester: 1, subjects: ['Advanced Manufacturing', 'Capstone Design I'] },
    { year: 4, semester: 2, subjects: ['Industrial Automation', 'Capstone Design II'] },
  ],
  'Electrical Engineering': [
    { year: 1, semester: 1, subjects: ['Circuit Analysis I', 'Physics I', 'Calculus for Engineers'] },
    { year: 1, semester: 2, subjects: ['Circuit Analysis II', 'Physics II', 'Linear Algebra'] },
    { year: 2, semester: 1, subjects: ['Signals and Systems', 'Electronics I', 'Electromagnetics'] },
    { year: 2, semester: 2, subjects: ['Electronics II', 'Digital Systems', 'Probability and Random Processes'] },
    { year: 3, semester: 1, subjects: ['Control Theory', 'Communication Systems', 'Power Systems'] },
    { year: 3, semester: 2, subjects: ['Microprocessors', 'Digital Signal Processing', 'Antenna Theory'] },
    { year: 4, semester: 1, subjects: ['VLSI Design', 'Embedded Systems'] },
    { year: 4, semester: 2, subjects: ['Advanced Power Electronics', 'Capstone Project'] },
  ],
  'Medicine': [
    { year: 1, semester: 1, subjects: ['Anatomy I', 'Biochemistry', 'Medical Ethics'] },
    { year: 1, semester: 2, subjects: ['Anatomy II', 'Physiology I', 'Histology'] },
    { year: 2, semester: 1, subjects: ['Physiology II', 'Pharmacology I', 'Microbiology'] },
    { year: 2, semester: 2, subjects: ['Pathology I', 'Immunology', 'Pharmacology II'] },
    { year: 3, semester: 1, subjects: ['Pathology II', 'Clinical Diagnosis', 'Internal Medicine'] },
    { year: 3, semester: 2, subjects: ['Surgery Basics', 'Pediatrics', 'Obstetrics and Gynecology'] },
    { year: 4, semester: 1, subjects: ['Cardiology', 'Neurology', 'Clinical Rotations I'] },
    { year: 4, semester: 2, subjects: ['Emergency Medicine', 'Psychiatry', 'Clinical Rotations II'] },
  ],
  'Business Administration': [
    { year: 1, semester: 1, subjects: ['Principles of Management', 'Financial Accounting', 'Business Mathematics'] },
    { year: 1, semester: 2, subjects: ['Microeconomics for Business', 'Business Communication', 'Marketing Fundamentals'] },
    { year: 2, semester: 1, subjects: ['Managerial Accounting', 'Organizational Behavior', 'Business Statistics'] },
    { year: 2, semester: 2, subjects: ['Corporate Finance', 'Operations Management', 'Business Law'] },
    { year: 3, semester: 1, subjects: ['Human Resource Management', 'Consumer Behavior', 'Management Information Systems'] },
    { year: 3, semester: 2, subjects: ['Strategic Management', 'Supply Chain Management', 'Entrepreneurship'] },
    { year: 4, semester: 1, subjects: ['International Business', 'Project Management', 'Business Ethics'] },
    { year: 4, semester: 2, subjects: ['Leadership Seminar', 'Capstone in Business Administration'] },
  ],
  'Economics': [
    { year: 1, semester: 1, subjects: ['Principles of Microeconomics', 'Calculus for Economics', 'Introduction to Economic History'] },
    { year: 1, semester: 2, subjects: ['Principles of Macroeconomics', 'Statistics for Social Sciences', 'Introduction to Public Policy'] },
    { year: 2, semester: 1, subjects: ['Intermediate Microeconomics', 'Intermediate Macroeconomics', 'Econometrics I'] },
    { year: 2, semester: 2, subjects: ['Mathematical Economics', 'Money and Banking', 'Econometrics II'] },
    { year: 3, semester: 1, subjects: ['International Economics', 'Game Theory', 'Labor Economics'] },
    { year: 3, semester: 2, subjects: ['Development Economics', 'Public Economics', 'Industrial Organization'] },
    { year: 4, semester: 1, subjects: ['Behavioral Economics', 'Financial Economics', 'Research Methods in Economics'] },
    { year: 4, semester: 2, subjects: ['Advanced Economic Policy', 'Economics Thesis Seminar'] },
  ],
  'Philosophy': [
    { year: 1, semester: 1, subjects: ['Introduction to Philosophy', 'Critical Thinking', 'Ancient Philosophy'] },
    { year: 1, semester: 2, subjects: ['Logic I', 'Ethics', 'Early Modern Philosophy'] },
    { year: 2, semester: 1, subjects: ['Metaphysics', 'Epistemology', 'Philosophy of Religion'] },
    { year: 2, semester: 2, subjects: ['Logic II', 'Political Philosophy', 'Nineteenth Century Philosophy'] },
    { year: 3, semester: 1, subjects: ['Philosophy of Mind', 'Philosophy of Science', 'Existentialism'] },
    { year: 3, semester: 2, subjects: ['Aesthetics', 'Contemporary Analytic Philosophy', 'Applied Ethics'] },
    { year: 4, semester: 1, subjects: ['Seminar in Moral Philosophy', 'Comparative Philosophy', 'Research Writing in Philosophy'] },
    { year: 4, semester: 2, subjects: ['Senior Thesis', 'Special Topics in Philosophy'] },
  ],
};

async function runSeed() {
  console.log('Seeding database…');
  const totalMajors = Object.keys(SEED_DATA).length;

  for (const [majorName, yearData] of Object.entries(SEED_DATA)) {
    const major = await Major.findOneAndUpdate(
      { name: majorName },
      { name: majorName },
      { upsert: true, new: true }
    );

    for (const { year, semester, subjects } of yearData) {
      for (const subjectName of subjects) {
        await Subject.findOneAndUpdate(
          { name: subjectName, major_id: major._id, year, semester },
          { name: subjectName, major_id: major._id, year, semester },
          { upsert: true, new: true }
        );
      }
    }
  }
  console.log(`Seed complete — ${totalMajors} majors and all subjects inserted.`);
}

// Run directly: node src/seed.js
if (require.main === module) {
  connectDB()
    .then(runSeed)
    .then(() => mongoose.connection.close())
    .catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { runSeed };
