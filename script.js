const defaultVocabulary = [
  {
    word: "apple",
    meaning: "qua tao",
    partOfSpeech: "noun",
    example: "I eat an apple every day.",
    topic: "Food"
  },
  {
    word: "book",
    meaning: "quyen sach",
    partOfSpeech: "noun",
    example: "This is my favorite book.",
    topic: "School"
  },
  {
    word: "family",
    meaning: "gia dinh",
    partOfSpeech: "noun",
    example: "I love my family.",
    topic: "Daily Life"
  }
];

let vocabulary = JSON.parse(localStorage.getItem("myVocabulary")) || defaultVocabulary;
let selectedTopic = "All";
let currentIndex = 0;
let practiceIndex = 0;
let currentStudyWord = null;
let flashcardDefaultSide = localStorage.getItem("flashcardDefaultSide") || "english";
let flashcardSide = flashcardDefaultSide;
let practiceMode = localStorage.getItem("practiceMode") || "english-to-vietnamese";
let nextPracticeTimer = null;

const wordEl = document.getElementById("word");
const meaningEl = document.getElementById("meaning");
const exampleEl = document.getElementById("example");
const partOfSpeechEl = document.getElementById("partOfSpeech");
const topicEl = document.getElementById("topic");
const flashcardFlipEl = document.getElementById("flashcardFlip");
const englishFirstBtn = document.getElementById("englishFirstBtn");
const vietnameseFirstBtn = document.getElementById("vietnameseFirstBtn");
const nextBtn = document.getElementById("nextBtn");
const deleteBtn = document.getElementById("deleteBtn");
const wordCountEl = document.getElementById("wordCount");
const topicListEl = document.getElementById("topicList");
const studyTabBtn = document.getElementById("studyTabBtn");
const practiceTabBtn = document.getElementById("practiceTabBtn");
const studyView = document.getElementById("studyView");
const practiceView = document.getElementById("practiceView");
const practiceTopicEl = document.getElementById("practiceTopic");
const englishToVietnameseBtn = document.getElementById("englishToVietnameseBtn");
const vietnameseToEnglishBtn = document.getElementById("vietnameseToEnglishBtn");
const practiceLabelEl = document.getElementById("practiceLabel");
const practiceWordEl = document.getElementById("practiceWord");
const practiceAnswerLabelEl = document.getElementById("practiceAnswerLabel");
const practiceAnswerInput = document.getElementById("practiceAnswer");
const checkAnswerBtn = document.getElementById("checkAnswerBtn");
const nextPracticeBtn = document.getElementById("nextPracticeBtn");
const practiceResultEl = document.getElementById("practiceResult");

const newWordInput = document.getElementById("newWord");
const newMeaningInput = document.getElementById("newMeaning");
const newPartOfSpeechInput = document.getElementById("newPartOfSpeech");
const newExampleInput = document.getElementById("newExample");
const newTopicInput = document.getElementById("newTopic");
const addBtn = document.getElementById("addBtn");
const addMessageEl = document.getElementById("addMessage");

function getFilteredVocabulary() {
  if (selectedTopic === "All") {
    return vocabulary;
  }

  return vocabulary.filter(function (item) {
    return item.topic === selectedTopic;
  });
}

function saveVocabulary() {
  localStorage.setItem("myVocabulary", JSON.stringify(vocabulary));
}

function getDisplayText(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();

  if (text === "") {
    return fallback;
  }

  return text;
}

function getExampleText(value) {
  const text = getDisplayText(value, "Null");

  if (text.toLowerCase() === "example" || text.toLowerCase() === "null") {
    return "Null";
  }

  return text;
}

function normalizeExample(value) {
  const text = getExampleText(value);

  return text === "Null" ? null : text;
}

function normalizeVocabularyExamples() {
  let hasChanges = false;

  vocabulary.forEach(function (item) {
    const normalizedExample = normalizeExample(item.example);

    if (item.example !== normalizedExample) {
      item.example = normalizedExample;
      hasChanges = true;
    }
  });

  if (hasChanges) {
    saveVocabulary();
  }
}

function showAddMessage(message, type) {
  addMessageEl.textContent = message;
  addMessageEl.className = `add-message ${type}`;
}

function updateDefaultSideButtons() {
  englishFirstBtn.classList.toggle("active", flashcardDefaultSide === "english");
  vietnameseFirstBtn.classList.toggle("active", flashcardDefaultSide === "vietnamese");
}

function setFlashcardDefaultSide(side) {
  flashcardDefaultSide = side;
  flashcardSide = side;
  localStorage.setItem("flashcardDefaultSide", side);
  updateDefaultSideButtons();
  renderFlashcardSide();
}

function renderFlashcardSide() {
  if (!currentStudyWord) {
    flashcardFlipEl.classList.remove("flipped");
    partOfSpeechEl.textContent = "Parts of speech: Not set";
    wordEl.textContent = "No words yet";
    meaningEl.textContent = "No words yet";
    exampleEl.textContent = "Example: Null";
    return;
  }

  const isVietnameseSide = flashcardSide === "vietnamese";

  flashcardFlipEl.classList.toggle("flipped", isVietnameseSide);
  partOfSpeechEl.textContent = `Parts of speech: ${getDisplayText(currentStudyWord.partOfSpeech, "Not set")}`;
  wordEl.textContent = currentStudyWord.word;
  meaningEl.textContent = currentStudyWord.meaning;
  exampleEl.textContent = `Example: ${getExampleText(currentStudyWord.example)}`;
}

function resetFlashcardSide() {
  flashcardSide = flashcardDefaultSide;
  renderFlashcardSide();
}

function flipFlashcard() {
  if (!currentStudyWord) {
    return;
  }

  flashcardSide = flashcardSide === "english" ? "vietnamese" : "english";
  renderFlashcardSide();
}

function getCurrentPracticeWord() {
  const studyList = getFilteredVocabulary();

  if (studyList.length === 0) {
    return null;
  }

  if (practiceIndex >= studyList.length) {
    practiceIndex = 0;
  }

  return studyList[practiceIndex];
}

function updatePracticeModeButtons() {
  englishToVietnameseBtn.classList.toggle("active", practiceMode === "english-to-vietnamese");
  vietnameseToEnglishBtn.classList.toggle("active", practiceMode === "vietnamese-to-english");
}

function setPracticeMode(mode) {
  practiceMode = mode;
  localStorage.setItem("practiceMode", mode);
  updatePracticeModeButtons();
  showPracticeWord();
  practiceAnswerInput.focus();
}

function getPracticePrompt(word) {
  if (practiceMode === "vietnamese-to-english") {
    return word.meaning;
  }

  return word.word;
}

function getPracticeAnswer(word) {
  if (practiceMode === "vietnamese-to-english") {
    return word.word;
  }

  return word.meaning;
}

function updatePracticeCopy() {
  const isVietnameseToEnglish = practiceMode === "vietnamese-to-english";

  practiceLabelEl.textContent = isVietnameseToEnglish
    ? "Nhap tu tieng Anh cua nghia nay"
    : "Nhap nghia cua tu nay";
  practiceAnswerLabelEl.textContent = isVietnameseToEnglish
    ? "English word"
    : "Cau tra loi";
  practiceAnswerInput.placeholder = isVietnameseToEnglish
    ? "Nhap tu tieng Anh"
    : "Nhap nghia tieng Viet";
}

function goToNextPracticeWord() {
  const studyList = getFilteredVocabulary();

  if (studyList.length === 0) {
    return;
  }

  practiceIndex++;

  if (practiceIndex >= studyList.length) {
    practiceIndex = 0;
  }

  showPracticeWord();
  practiceAnswerInput.focus();
}

function renderTopics() {
  const topics = ["All"];

  vocabulary.forEach(function (item) {
    if (!topics.includes(item.topic)) {
      topics.push(item.topic);
    }
  });

  if (!topics.includes(selectedTopic)) {
    selectedTopic = "All";
    currentIndex = 0;
  }

  topicListEl.innerHTML = "";

  topics.forEach(function (topic) {
    const topicButton = document.createElement("button");
    const topicCount = topic === "All"
      ? vocabulary.length
      : vocabulary.filter(function (item) {
          return item.topic === topic;
        }).length;

    topicButton.className = "topic-btn";
    topicButton.textContent = `${topic} (${topicCount})`;

    if (topic === selectedTopic) {
      topicButton.classList.add("active");
    }

    topicButton.addEventListener("click", function () {
      selectedTopic = topic;
      currentIndex = 0;
      practiceIndex = 0;
      renderTopics();
      showWord();
      showPracticeWord();
    });

    topicListEl.appendChild(topicButton);
  });
}

function showWord() {
  const studyList = getFilteredVocabulary();

  if (studyList.length === 0) {
    currentStudyWord = null;
    wordEl.textContent = "No words yet";
    meaningEl.textContent = "Add your first word";
    topicEl.textContent = `Topic: ${selectedTopic}`;
    wordCountEl.textContent = `${vocabulary.length} words`;
    nextBtn.disabled = true;
    deleteBtn.disabled = true;
    renderFlashcardSide();
    showPracticeWord();
    return;
  }

  nextBtn.disabled = false;
  deleteBtn.disabled = false;

  if (currentIndex >= studyList.length) {
    currentIndex = 0;
  }

  const currentWord = studyList[currentIndex];

  currentStudyWord = currentWord;
  topicEl.textContent = `Topic: ${currentWord.topic}`;
  wordCountEl.textContent = selectedTopic === "All"
    ? `${vocabulary.length} words`
    : `${studyList.length} / ${vocabulary.length} words`;

  resetFlashcardSide();
  showPracticeWord();
}

function showPracticeWord() {
  const studyList = getFilteredVocabulary();

  practiceAnswerInput.value = "";
  practiceResultEl.textContent = "";
  practiceResultEl.className = "practice-result";
  practiceTopicEl.textContent = `Topic: ${selectedTopic}`;
  updatePracticeCopy();

  if (studyList.length === 0) {
    practiceWordEl.textContent = "No words yet";
    practiceAnswerInput.disabled = true;
    checkAnswerBtn.disabled = true;
    nextPracticeBtn.disabled = true;
    return;
  }

  const currentPracticeWord = getCurrentPracticeWord();

  practiceWordEl.textContent = getPracticePrompt(currentPracticeWord);
  practiceAnswerInput.disabled = false;
  checkAnswerBtn.disabled = false;
  nextPracticeBtn.disabled = false;
}

function switchTab(tabName) {
  const isPracticeTab = tabName === "practice";

  studyView.classList.toggle("hidden", isPracticeTab);
  practiceView.classList.toggle("hidden", !isPracticeTab);
  studyTabBtn.classList.toggle("active", !isPracticeTab);
  practiceTabBtn.classList.toggle("active", isPracticeTab);

  if (isPracticeTab) {
    showPracticeWord();
    practiceAnswerInput.focus();
  }
}

nextBtn.addEventListener("click", function () {
  const studyList = getFilteredVocabulary();

  if (studyList.length === 0) {
    return;
  }

  currentIndex++;

  if (currentIndex >= studyList.length) {
    currentIndex = 0;
  }

  showWord();
});

flashcardFlipEl.addEventListener("click", flipFlashcard);

flashcardFlipEl.addEventListener("keydown", function (event) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    flipFlashcard();
  }
});

englishFirstBtn.addEventListener("click", function () {
  setFlashcardDefaultSide("english");
});

vietnameseFirstBtn.addEventListener("click", function () {
  setFlashcardDefaultSide("vietnamese");
});

studyTabBtn.addEventListener("click", function () {
  switchTab("study");
});

practiceTabBtn.addEventListener("click", function () {
  switchTab("practice");
});

englishToVietnameseBtn.addEventListener("click", function () {
  setPracticeMode("english-to-vietnamese");
});

vietnameseToEnglishBtn.addEventListener("click", function () {
  setPracticeMode("vietnamese-to-english");
});

checkAnswerBtn.addEventListener("click", function () {
  const currentPracticeWord = getCurrentPracticeWord();

  if (!currentPracticeWord) {
    return;
  }

  const userAnswer = practiceAnswerInput.value.trim().toLowerCase();
  const correctAnswerText = getPracticeAnswer(currentPracticeWord);
  const correctAnswer = correctAnswerText.trim().toLowerCase();

  if (userAnswer === "") {
    practiceResultEl.textContent = "Hay nhap cau tra loi truoc.";
    practiceResultEl.className = "practice-result warning";
    return;
  }

  if (userAnswer === correctAnswer) {
    practiceResultEl.textContent = "Dung roi!";
    practiceResultEl.className = "practice-result correct";
    clearTimeout(nextPracticeTimer);
    nextPracticeTimer = setTimeout(goToNextPracticeWord, 700);
    return;
  }

  practiceAnswerInput.value = "";
  practiceAnswerInput.focus();
});

practiceAnswerInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    checkAnswerBtn.click();
  }
});

nextPracticeBtn.addEventListener("click", function () {
  clearTimeout(nextPracticeTimer);
  goToNextPracticeWord();
});

deleteBtn.addEventListener("click", function () {
  const studyList = getFilteredVocabulary();

  if (studyList.length === 0) {
    return;
  }

  const currentWord = studyList[currentIndex];
  const shouldDelete = confirm(`Delete "${currentWord.word}" from your list?`);

  if (!shouldDelete) {
    return;
  }

  const wordIndex = vocabulary.indexOf(currentWord);
  vocabulary.splice(wordIndex, 1);
  saveVocabulary();

  if (currentIndex >= getFilteredVocabulary().length) {
    currentIndex = 0;
  }

  if (practiceIndex >= getFilteredVocabulary().length) {
    practiceIndex = 0;
  }

  renderTopics();
  showWord();
});

addBtn.addEventListener("click", function () {
  const word = newWordInput.value.trim();
  const meaning = newMeaningInput.value.trim();
  const partOfSpeech = newPartOfSpeechInput.value.trim();
  const example = normalizeExample(newExampleInput.value);
  const topic = newTopicInput.value.trim() || "My list";

  if (word === "" || meaning === "") {
    showAddMessage("Please enter a word and its meaning.", "warning");
    return;
  }

  const newWord = {
    word: word,
    meaning: meaning,
    partOfSpeech: partOfSpeech,
    example: example,
    topic: topic
  };

  vocabulary.push(newWord);
  saveVocabulary();

  selectedTopic = topic;
  currentIndex = getFilteredVocabulary().length - 1;
  practiceIndex = currentIndex;
  renderTopics();
  showWord();

  newWordInput.value = "";
  newMeaningInput.value = "";
  newPartOfSpeechInput.value = "";
  newExampleInput.value = "";
  newTopicInput.value = "";

  showAddMessage("New word added!", "success");
});

normalizeVocabularyExamples();
renderTopics();
updateDefaultSideButtons();
updatePracticeModeButtons();
showWord();
