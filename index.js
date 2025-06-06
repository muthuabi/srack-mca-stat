const express = require('express');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const path = require('path');
const dotenv = require('dotenv');
const fs = require("fs");
const CryptoJS = require("crypto-js");
const app = express();
dotenv.config();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
const encryptedData = fs.readFileSync("./data/data.enc", "utf8");
const decrypted = CryptoJS.AES.decrypt(encryptedData, process.env.CIPHER_KEY).toString(CryptoJS.enc.Utf8);
const users=JSON.parse(decrypted);
// const users= require("./data/data.json");
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
let err=null;
async function extractSkillRackData(url) {
  try {
    const response = await axios.get(url);
    const html = response.data;
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const resumeStatus=document.querySelector('.ui-outputpanel.ui-widget')?.textContent.trim();
    // Extract basic info
    // console.log(resumeStatus);
    if(resumeStatus?.includes("resume not found"))
    {
        return null;
    }
    const name = document.querySelector('.ui.big.label.black')?.textContent.trim() || 'N/A';
    const registerNumber = document.querySelector('.ui.four.wide.center.aligned.column')?.textContent.match(/\d{16}/)?.[0] || 'N/A';
    const program = document.querySelector('.ui.large.label')?.textContent.trim() || 'N/A';
    const college = document.querySelector('.ui.four.wide.center.aligned.column')?.textContent.includes('Thiagarajar College of Engineering (TCE), Madurai') ? 'Thiagarajar College of Engineering (TCE), Madurai' : 'N/A';
    const year = document.querySelector('.ui.four.wide.center.aligned.column')?.textContent.match(/\(.*?\)\s*(\d{4})/)?.[1] || 'N/A';
    const gender = document.querySelector('.ui.fourteen.wide.left.aligned.column')?.textContent.trim() || 'N/A';

    // Extract programming summary
    const rank = document.querySelector('.ui.five.small.statistics .statistic .value')?.textContent.replace(/\D/g, '') || '0';
    const level = document.querySelectorAll('.ui.five.small.statistics .statistic .value')[1]?.textContent || '0/10';
    const gold = document.querySelectorAll('.ui.five.small.statistics .statistic .value')[2]?.textContent.replace(/\D/g, '') || '0';
    const silver = document.querySelectorAll('.ui.five.small.statistics .statistic .value')[3]?.textContent.replace(/\D/g, '') || '0';
    const bronze = document.querySelectorAll('.ui.five.small.statistics .statistic .value')[4]?.textContent.replace(/\D/g, '') || '0';

    // Extract program counts
    const programsSolved = document.querySelectorAll('.ui.six.small.statistics .statistic .value')[0]?.textContent.replace(/\D/g, '') || '0';
    const codeTest = document.querySelectorAll('.ui.six.small.statistics .statistic .value')[1]?.textContent.replace(/\D/g, '') || '0';
    const codeTrack = document.querySelectorAll('.ui.six.small.statistics .statistic .value')[2]?.textContent.replace(/\D/g, '') || '0';
    const dc = document.querySelectorAll('.ui.six.small.statistics .statistic .value')[3]?.textContent.replace(/\D/g, '') || '0';
    const dt = document.querySelectorAll('.ui.six.small.statistics .statistic .value')[4]?.textContent.replace(/\D/g, '') || '0';
    const codeTutor = document.querySelectorAll('.ui.six.small.statistics .statistic .value')[5]?.textContent.replace(/\D/g, '') || '0';

    // Extract all language stats dynamically
    const languageStats = {};
    const languageElements = document.querySelectorAll('.ui.six.small.statistics .statistic');
    languageElements.forEach(el => {
        const label = el.querySelector('.label')?.textContent.trim();
        const value = el.querySelector('.value')?.textContent.replace(/\D/g, '') || '0';
        if (label && !['PROGRAMS SOLVED', 'CODE TEST', 'CODE TRACK', 'DC', 'DT', 'CODE TUTOR'].includes(label.toUpperCase())) {
            languageStats[label.toLowerCase()] = value;
        }
    });

    // Calculate points
    const codeTutorPoints = parseInt(codeTutor) * 0;
    const codeTrackPoints = parseInt(codeTrack) * 2;
    const dcPoints = parseInt(dc) * 2;
    const dtPoints = parseInt(dt) * 20;
    const codeTestPoints = parseInt(codeTest) * 30;
    const totalPoints = codeTutorPoints + codeTrackPoints + dcPoints + dtPoints + codeTestPoints;
    const percentage = (totalPoints / 5000 * 100).toFixed(2);

    return {
      basicInfo: {
        name,
        registerNumber,
        program,
        college,
        year,
        gender,
        skillRackURL:`${url}`
      },
      programmingSummary: {
        rank,
        level,
        medals: {
          gold,
          silver,
          bronze
        }
      },
      programCounts: {
        programsSolved,
        codeTest,
        codeTrack,
        dc,
        dt,
        codeTutor
      },
      languageStats,
      pointsCalculation: {
        codeTutor: `${codeTutor} x 0 = ${codeTutorPoints}`,
        codeTrack: `${codeTrack} x 2 = ${codeTrackPoints}`,
        dc: `${dc} x 2 = ${dcPoints}`,
        dt: `${dt} x 20 = ${dtPoints}`,
        codeTest: `${codeTest} x 30 = ${codeTestPoints}`,
        totalPoints: `${totalPoints} (${percentage}%)`,
        points:totalPoints,
        percentage
      }
    };
  } catch (error) {
    // console.error('Error extracting data:', error);
    err=error;
    return null;
  }
}

app.get('/api/users', (req, res) => {
  res.json(users);
});

app.get('/api/user/srack-url/', async (req, res) => {
  try {
    const srackURL=atob(req.query.url);
    if(!srackURL)
      return res.status(400).send({message:"URL Not Provided",error:"URL Invalid"});
    const skillRackData = await extractSkillRackData(srackURL);
    if (!skillRackData) {
      return res.status(500).json({ error: 'Failed to fetch SkillRack data' });
    }
    
    res.json({
      skillRackData
    });
  } catch (error) {
    // console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/stat/save-stat-file', (req, res) => {
    const encFilePath = path.join(__dirname, 'data/stat-file.enc');
    const today = new Date().toLocaleDateString('en-CA');;
    const newData = req.body.data;

    const CIPHER_KEY = process.env.CIPHER_KEY;

    let stats = {};

    try {
        if (fs.existsSync(encFilePath)) {
            const encryptedContent = fs.readFileSync(encFilePath, 'utf8');
            const decrypted = CryptoJS.AES.decrypt(encryptedContent, CIPHER_KEY).toString(CryptoJS.enc.Utf8);
            stats = JSON.parse(decrypted || '{}');
        }
    } catch (err) {
        console.error("Decryption failed:", err);
        return res.status(500).send('Failed to decrypt previous stats.');
    }
    try {
        stats[today] = newData;
        const stringified = JSON.stringify(stats, null, 2);
        const encrypted = CryptoJS.AES.encrypt(stringified, CIPHER_KEY).toString();
        fs.writeFileSync(encFilePath, encrypted);
        res.send('Stat saved for ' + today);
    } catch (err) {
        console.error("Encryption failed:", err);
        res.status(500).send('Failed to save encrypted stat.');
    }
});
app.get('/api/stat/get-stat-file', (req, res) => {
    const encFilePath = path.join(__dirname, 'data/stat-file.enc');
    const CIPHER_KEY = process.env.CIPHER_KEY;
    const date = req.query.date; // optional

    if (!fs.existsSync(encFilePath)) {
        return res.status(404).json({
            success: false,
            data: null,
            message: "Stat file not found",
            err: "FileMissing"
        });
    }

    try {
        const encrypted = fs.readFileSync(encFilePath, 'utf8');
        const decrypted = CryptoJS.AES.decrypt(encrypted, CIPHER_KEY).toString(CryptoJS.enc.Utf8);
        const stats = JSON.parse(decrypted || '{}');
//         console.log(stats);
        if (date) {
            if (!stats[date]) {
                return res.status(404).json({
                    success: false,
                    data: null,
                    message: "No data found for the given date",
                    err: "DateNotFound"
                });
            }
            return res.status(200).json({
                success: true,
                data: { date, stats: stats[date] },
                message: "Data fetched successfully",
                err: null
            });
        }

        // No date provided: return all stats
        return res.status(200).json({
            success: true,
            data: stats,
            message: "All stats fetched successfully",
            err: null
        });

    } catch (err) {
        console.error("Failed to decrypt or parse stats:", err);
        return res.status(500).json({
            success: false,
            data: null,
            message: "Error reading encrypted stats",
            err: err.message
        });
    }
});


app.get('/api/user/:registerNumber', async (req, res) => {
  const registerNumber = req.params.registerNumber;
  const user = users.find(u => u.registerNumber === registerNumber);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    const skillRackData = await extractSkillRackData(user.skillRackURL);
    if (!skillRackData) {
      return res.status(500).json({ error: 'Failed to fetch SkillRack data',err });
    }
    
    res.json({
      user,
      skillRackData
    });
  } catch (error) {
    // console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error',err });
  }
});


app.get('/api/all-users-data', async (req, res) => {
  try {
    const allUsersData = [];
    
    for (const user of users) {
      try {
        const skillRackData = await extractSkillRackData(user.skillRackURL);
        allUsersData.push({
          user,
          skillRackData
        });
        await delay(1000);
      } catch (error) {
        // console.error(`Error processing user ${user.registerNumber}:`, error);
        allUsersData.push({
          user,
          skillRackData: null,
          error: 'Failed to fetch SkillRack data'
        });
      }
    }
    
    res.json(allUsersData);
  } catch (error) {
    // console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/srack-track', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'srack-url-stat.html'));
});
app.get('/tce-mca-track', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/tce-mca-history', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'srack-history-data.html'));
});
// Serve the main HTML file for / route
app.get('/', (req, res) => {
  res.redirect('/tce-mca-track');
});

app.use((req,res,next)=>{
    res.status(404).sendFile(path.join(__dirname, 'public', 'page-not-found.html'));
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
