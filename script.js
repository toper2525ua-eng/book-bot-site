const API_KEY = "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";
const SITE_URL = "https://openrouter.ai/api/v1/chat/completions";

document.addEventListener('DOMContentLoaded', () => {
    const navBtns = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');

    // Load books from local storage on startup
    loadLibrary();

    // Navigation Logic
    function navigateTo(targetId) {
        navBtns.forEach(btn => {
            if (btn.dataset.target === targetId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        pages.forEach(page => {
            if (page.id === targetId) {
                page.classList.add('active');
                setTimeout(() => {
                    page.style.opacity = '1';
                    page.style.transform = 'translateY(0)';
                }, 10);
            } else {
                page.style.opacity = '0';
                page.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    page.classList.remove('active');
                }, 500);
            }
        });
    }

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navigateTo(btn.dataset.target);
        });
    });

    window.navigateTo = navigateTo;

    // --- AI GENERATION LOGIC ---

    const form = document.getElementById('book-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = form.querySelector('button');
            const originalText = btn.innerText;

            // Gather Data
            const promptText = document.getElementById('prompt').value;
            const genre = document.getElementById('genre').value;
            const language = document.getElementById('language').value;
            const length = document.getElementById('length').value;
            const tone = document.getElementById('tone').value;

            if (!promptText) {
                alert("Будь ласка, напишіть хоча б короткий опис сюжету!");
                return;
            }

            // UI Loading State
            btn.innerText = '✨ Пишемо вашу книгу... (це може зайняти хвилину)';
            btn.disabled = true;
            btn.style.background = 'linear-gradient(to right, #4ade80, #22c55e)'; // Green pulse

            try {
                // 1. Generate Text
                const systemPrompt = `You are a professional book author. Write a creative story based on the user's request.
                Language: ${language}
                Genre: ${genre}
                Tone: ${tone}
                Length: ${length === 'short' ? 'approx 500 words' : length === 'medium' ? 'approx 1500 words' : 'approx 3000 words'}
                
                Output format: JSON with fields: "title" (string), "content" (string, use HTML <p> tags for paragraphs).
                Ensure the story is engaging and high quality.`;

                let model = "google/gemini-2.0-flash-exp:free";
                let response = await fetch(SITE_URL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:8000",
                        "X-Title": "AI Book Creator"
                    },
                    body: JSON.stringify({
                        "model": model,
                        "messages": [
                            { "role": "system", "content": systemPrompt },
                            { "role": "user", "content": promptText }
                        ]
                    })
                });

                // Fallback logic 1
                if (!response.ok) {
                    console.warn("Primary model failed, switching to backup 1...");
                    model = "meta-llama/llama-3-8b-instruct:free";
                    response = await fetch(SITE_URL, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${API_KEY}`,
                            "Content-Type": "application/json",
                            "HTTP-Referer": "http://localhost:8000",
                            "X-Title": "AI Book Creator"
                        },
                        body: JSON.stringify({
                            "model": model,
                            "messages": [
                                { "role": "system", "content": systemPrompt },
                                { "role": "user", "content": promptText }
                            ]
                        })
                    });
                }

                // Fallback logic 2
                if (!response.ok) {
                    console.warn("Backup 1 failed, switching to backup 2...");
                    model = "microsoft/phi-3-medium-128k-instruct:free";
                    response = await fetch(SITE_URL, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${API_KEY}`,
                            "Content-Type": "application/json",
                            "HTTP-Referer": "http://localhost:8000",
                            "X-Title": "AI Book Creator"
                        },
                        body: JSON.stringify({
                            "model": model,
                            "messages": [
                                { "role": "system", "content": systemPrompt },
                                { "role": "user", "content": promptText }
                            ]
                        })
                    });
                }

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error?.message || `API Error: ${response.status}`);
                }

                const data = await response.json();
                if (!data.choices || !data.choices[0]) {
                    throw new Error("Invalid API response: No choices returned");
                }

                let aiContent = data.choices[0].message.content;

                // Clean up JSON
                aiContent = aiContent.replace(/```json/g, '').replace(/```/g, '');

                let bookData;
                try {
                    bookData = JSON.parse(aiContent);
                } catch (e) {
                    console.error("JSON Parse Error", aiContent);
                    // Attempt to recover if it's just text
                    bookData = {
                        title: "Згенерована історія",
                        content: `<p>${aiContent}</p>`
                    };
                }

                // 2. Generate Image (Pollinations)
                const imagePrompt = `${bookData.title}, ${genre} style, masterpiece, high quality, 8k, detailed`;
                const encodedPrompt = encodeURIComponent(imagePrompt);
                const coverUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=600&height=900&nologo=true`;

                // 3. Save Book
                const newBook = {
                    id: Date.now(),
                    title: bookData.title,
                    content: bookData.content,
                    cover: coverUrl,
                    genre: genre,
                    date: new Date().toLocaleDateString()
                };

                saveBook(newBook);

                // Success UI
                btn.innerText = 'Готово! Переходимо до бібліотеки...';
                setTimeout(() => {
                    navigateTo('reader');
                    loadLibrary(); // Refresh library
                    btn.innerText = originalText;
                    btn.disabled = false;
                    btn.style.background = ''; // Reset style
                    form.reset();
                }, 1500);

            } catch (error) {
                console.error(error);
                alert(`Вибачте, сталася помилка: ${error.message}`);
                btn.innerText = originalText;
                btn.disabled = false;
                btn.style.background = '';
            }
        });
    }

    // --- LIBRARY & READER LOGIC ---

    function saveBook(book) {
        let books = JSON.parse(localStorage.getItem('ai_books') || '[]');
        books.unshift(book); // Add to top
        localStorage.setItem('ai_books', JSON.stringify(books));
    }

    function loadLibrary() {
        const listContainer = document.querySelector('.book-list');
        const books = JSON.parse(localStorage.getItem('ai_books') || '[]');

        if (books.length === 0) {
            listContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">У вас поки немає книг. Створіть першу!</p>';
            return;
        }

        listContainer.innerHTML = '';
        books.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.innerHTML = `
                <div class="book-cover" style="background-image: url('${book.cover}'); background-size: cover; background-position: center;"></div>
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p>${book.genre} • ${book.date}</p>
                    <button class="btn small" onclick="openBook(${book.id})">Читати</button>
                    <button class="btn text" style="font-size: 0.8rem; color: #ef4444; margin-top: 0.5rem;" onclick="deleteBook(${book.id})">Видалити</button>
                </div>
            `;
            listContainer.appendChild(card);
        });
    }

    window.openBook = function (id) {
        const books = JSON.parse(localStorage.getItem('ai_books') || '[]');
        const book = books.find(b => b.id === id);

        if (book) {
            const readerView = document.querySelector('.reader-view');
            const bookList = document.querySelector('.book-list');

            // Hide list, show reader
            bookList.style.display = 'none';
            readerView.classList.remove('hidden');
            readerView.style.display = 'block';

            // Populate content
            readerView.querySelector('h3').innerText = book.title;
            readerView.querySelector('.content-area').innerHTML = book.content;

            // Scroll to top
            window.scrollTo(0, 0);
        }
    };

    window.closeReader = function () {
        const readerView = document.querySelector('.reader-view');
        const bookList = document.querySelector('.book-list');

        readerView.style.display = 'none';
        bookList.style.display = 'grid';
    };

    window.deleteBook = function (id) {
        if (confirm('Ви впевнені, що хочете видалити цю книгу?')) {
            let books = JSON.parse(localStorage.getItem('ai_books') || '[]');
            books = books.filter(b => b.id !== id);
            localStorage.setItem('ai_books', JSON.stringify(books));
            loadLibrary();
        }
    };
});
