/* Flashcards — add cards, list them, keep them in localStorage. */

const STORAGE_KEY = 'flashcards';

const form = document.getElementById('card-form');
const questionInput = document.getElementById('question');
const answerInput = document.getElementById('answer');
const errorMessage = document.getElementById('form-error');
const cardList = document.getElementById('card-list');
const emptyMessage = document.getElementById('empty-message');

let cards = loadCards();

function loadCards() {
  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (err) {
    // Corrupted or unreadable data — start fresh rather than break the page.
    return [];
  }

  if (!Array.isArray(stored)) {
    return [];
  }

  return stored.filter(function (card) {
    return card && typeof card.question === 'string' && typeof card.answer === 'string';
  });
}

function saveCards() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch (err) {
    showError('Could not save your cards in this browser.');
  }
}

function showError(message) {
  errorMessage.textContent = message;
}

function clearError() {
  errorMessage.textContent = '';
}

function render() {
  cardList.textContent = '';

  cards.forEach(function (card) {
    const item = document.createElement('li');
    item.className = 'card';

    const question = document.createElement('p');
    question.className = 'card-question';
    question.textContent = card.question;

    const answer = document.createElement('p');
    answer.className = 'card-answer';
    answer.textContent = card.answer;

    item.appendChild(question);
    item.appendChild(answer);
    cardList.appendChild(item);
  });

  emptyMessage.classList.toggle('hidden', cards.length > 0);
}

function addCard() {
  const question = questionInput.value.trim();
  const answer = answerInput.value.trim();

  if (!question && !answer) {
    showError('Please fill in both a question and an answer.');
    questionInput.focus();
    return;
  }

  if (!question) {
    showError('Please fill in the question.');
    questionInput.focus();
    return;
  }

  if (!answer) {
    showError('Please fill in the answer.');
    answerInput.focus();
    return;
  }

  clearError();
  cards.push({ question: question, answer: answer });
  saveCards();
  render();

  form.reset();
  questionInput.focus();
}

// Handles both the button and Enter pressed in either text field.
form.addEventListener('submit', function (event) {
  event.preventDefault();
  addCard();
});

render();
questionInput.focus();
