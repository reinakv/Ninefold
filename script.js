let currentIndex = 0;
let story;
let decisions = [];
let decisionWeights = [2, 3, 1, 2, 3];
let currentDecision = 0;
let currentPlotline = 'intro';

function loadProgress() {
  const saved = JSON.parse(sessionStorage.getItem('ninefold-progress'));
  if (saved) {
    currentIndex = saved.currentIndex;
    currentPlotline = saved.currentPlotline;
    decisions = saved.decisions || [];
    currentDecision = saved.currentDecision;
  }
}

function saveProgress() {
  sessionStorage.setItem('ninefold-progress', JSON.stringify({
    currentIndex,
    currentPlotline,
    decisions,
    currentDecision
  }));
}

function resetStory() {
  sessionStorage.removeItem('ninefold-progress');
  location.reload();
}

// Load story data
fetch('storyData.json')
  .then(res => res.json())
  .then(data => {
    story = data;
    loadProgress();
    showNextScene();
  });

function showNextScene() {
  const plot = story[currentPlotline];
  const scene = plot[currentIndex];
  if (!scene) return;

  if (scene.background) {
    document.getElementById('background').src = scene.background;
  }

  let text = scene.text;
  if (scene.showRoll && typeof window.lastRawRoll !== 'undefined') {
    text = text.replace('{roll}', window.lastRawRoll);
  }
  document.getElementById('text-box').innerHTML = text;

  const sceneImage = document.getElementById('scene-image');
  if (scene.image) {
    sceneImage.src = scene.image;
    sceneImage.style.display = 'block';

    if (scene.popup) {
      sceneImage.onclick = () => {
        const popup = document.getElementById('popup-box');
        popup.innerText = scene.popup;
        popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
      };
    }
  } else {
    sceneImage.style.display = 'none';
  }

  const choices = document.getElementById('choices');
  choices.innerHTML = '';

  if (scene.action === 'continue' || scene.action === 'redirect') {
    const btn = document.createElement('button');
    btn.textContent = scene.buttonText || 'Continue';
    btn.onclick = () => {
      if (scene.action === 'redirect' && scene.url) {
        window.location.href = scene.url;
      } else {
        currentIndex++;
        saveProgress();

        if (scene.nextDecision) {
          showDecisionChoices(scene.nextDecision);
        } else {
          showNextScene();
        }
      }
    };
    choices.appendChild(btn);
  }
}

function showDecisionChoices(decisionKey) {
  const decision = story[decisionKey];
  const choicesContainer = document.getElementById('choices');
  document.getElementById('text-box').innerText = '';
  choicesContainer.innerHTML = '';

  if (decision.mapping) {
    const rawRoll = rollRawDice();
    const simplifiedRoll = simplifyRawRoll(rawRoll);
    window.lastRawRoll = rawRoll;

    const nextPlotline = decision.mapping[simplifiedRoll.toString()];
    currentIndex = 0;
    currentPlotline = nextPlotline;

    decisions.push({ alignment: 0, outcome: simplifiedRoll });
    currentDecision++;
    saveProgress();
    updateDecisionList();
    showNextScene();
    return;
  }

  decision.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.textContent = choice.label;
    btn.onclick = () => {
      const alignmentScore = choice.alignment;
      const rawRoll = rollRawDice();
      const simplifiedRoll = simplifyRawRoll(rawRoll);
      window.lastRawRoll = rawRoll;

      decisions.push({ alignment: alignmentScore, outcome: simplifiedRoll });
      currentDecision++;

      currentIndex = 0;
      currentPlotline = choice.nextDecision;
      saveProgress();
      updateDecisionList();
      showDecisionChoices(choice.nextDecision);
    };
    choicesContainer.appendChild(btn);
  });
}

function rollRawDice() {
  const result = Math.floor(Math.random() * 6) + 1;
  showDice(result);
  return result;
}

function simplifyRawRoll(raw) {
  if (raw <= 2) return -1;
  if (raw <= 4) return 0;
  return 1;
}

function showDice(number) {
  const diceArea = document.getElementById('dice-area');
  diceArea.innerHTML = '';

  const dice = document.createElement('div');
  dice.classList.add('dice');
  dice.style.width = '100px';
  dice.style.height = '100px';
  dice.style.border = '3px double #edeff2';
  dice.style.borderRadius = '10px';
  dice.style.position = 'relative';
  dice.style.margin = '0 auto';

  const dotStyle = {
    width: '10px',
    height: '10px',
    background: '#edeff2',
    borderRadius: '50%',
    position: 'absolute',
    transform: 'translate(-50%, -50%)'
  };

  const positions = {
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[30, 30], [50, 50], [70, 70]],
    4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
    6: [[30, 30], [50, 30], [70, 30], [30, 70], [50, 70], [70, 70]]
  };

  positions[number].forEach(([top, left]) => {
    const dot = document.createElement('div');
    Object.assign(dot.style, dotStyle, {
      top: `${top}%`,
      left: `${left}%`
    });
    dice.appendChild(dot);
  });

  diceArea.appendChild(dice);

  gsap.set(dice, { scale: 0, opacity: 0, rotate: 0 });
  gsap.to(dice, {
    duration: 1,
    scale: 1,
    opacity: 1,
    rotate: 360,
    ease: 'bounce.out',
    onComplete: () => {
      gsap.to(diceArea, {
        duration: 1,
        opacity: 0,
        onComplete: () => diceArea.style.display = 'none'
      });
    }
  });

  diceArea.style.display = 'block';
  diceArea.style.opacity = 1;
}

function updateDecisionList() {
  const choicesList = document.getElementById('choices-list');
  if (!choicesList) return;

  choicesList.innerHTML = '';

  const alignmentLabels = {
    '-1': 'Chaotic',
    '0': 'Neutral',
    '1': 'Lawful'
  };

  const outcomeLabels = {
    '-1': 'Evil',
    '0': 'Neutral',
    '1': 'Good'
  };

  decisions.forEach((decision, index) => {
    if (typeof decision.alignment === 'number' && typeof decision.outcome === 'number') {
      const li = document.createElement('li');
      li.textContent = `Decision ${index + 1}: ${alignmentLabels[decision.alignment]} ${outcomeLabels[decision.outcome]}`;
      choicesList.appendChild(li);
    }
  });
}

function getFinalScore() {
  return decisions.reduce((sum, val) => sum + val.outcome, 0);
}

const endings = {
  "3": "The Beacon",
  "2": "The Mask",
  "1": "The Blade",
  "0": "The Echo",
  "-1": "The Adrift",
  "-2": "The Ember",
  "-3": "The Riddle",
  "-4": "The Mirror",
  "-5": "The Catalyst"
};

const alignmentTable = {
  "3": "Lawful Good",
  "2": "Lawful Neutral",
  "1": "Lawful Evil",
  "0": "Neutral Neutral",
  "-1": "Neutral Evil",
  "-2": "Chaotic Good",
  "-3": "Chaotic Neutral",
  "-4": "Neutral Good",
  "-5": "Chaotic Evil"
};

function getEndingName(score) {
  const scoreKey = String(score);
  return {
    name: endings[scoreKey] || "Unknown",
    alignment: alignmentTable[scoreKey] || "Unknown Alignment"
  };
}
