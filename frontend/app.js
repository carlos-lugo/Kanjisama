document.addEventListener('DOMContentLoaded', () => {

    // --- Configuration ---
    // IMPORTANT: Replace this with the actual API Gateway endpoint URL after deploying the backend
    const API_BASE_URL = 'https://r526nrw900.execute-api.ap-northeast-1.amazonaws.com';
  
    // --- Global State ---
    let currentPage = 0;
  
    // --- DOM Element References ---
    const cajaBusqueda = document.getElementById("caja-busqueda");
    const cajaComponer = document.getElementById("caja-componer");
    const limpiarBtn = document.getElementById('limpiar');
    const googleBtn = document.getElementById('google');
    const jishoBtn = document.getElementById('jisho-button'); // Button itself doesn't need listener now
    const mensajeStatus = document.getElementById('mensaje');
    const resultsTableBody = document.getElementById('kanji-table-body');
    const paginationInfo = document.getElementById('pagina');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
  
    // --- Modal Specific Elements ---
    const jishoModalElement = document.getElementById('jishoModal');
    const modalBody = document.getElementById('modal-body');
    // Optional: Create Bootstrap Modal instance if needed for programmatic control
    // const jishoBootstrapModal = new bootstrap.Modal(jishoModalElement);
  
  
    // --- Event Listeners ---
    if (cajaBusqueda) {
      cajaBusqueda.addEventListener("input", handleSearchInput);
    }
    if (limpiarBtn) {
      limpiarBtn.addEventListener('click', borra1);
    }
    if (googleBtn) {
      googleBtn.addEventListener('click', gtranslate);
    }
  
    // Listen for the Bootstrap 5 modal 'show' event directly on the modal element
    if (jishoModalElement) {
       jishoModalElement.addEventListener('show.bs.modal', solicitudApiJisho);
    }
  
    if (prevBtn) {
      prevBtn.addEventListener('click', pagMenos1);
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', pagMas1);
    }
  
  
    // --- Core Functions ---
  
    // Called when search input changes
    function handleSearchInput() {
      currentPage = 0; // Reset page number
      solicitudApiKanji();
    }
  
    // Fetch Kanji data from backend API
    async function solicitudApiKanji() {
      const searchTerm = cajaBusqueda.value.trim();
      // Handle empty search term for API call if necessary (depends on backend handler)
      const searchParam = searchTerm === '' ? '_' : encodeURIComponent(searchTerm); // Use placeholder or adjust API route
      const url = `${API_BASE_URL}/query/${searchParam}/${currentPage}`;
  
      mensajeStatus.textContent = 'Buscando...';
      resultsTableBody.innerHTML = ''; // Clear previous results
      disablePagination();
  
      try {
        const response = await fetch(url);
  
        if (!response.ok) {
          // Try to get error message from response body if available
          let errorMsg = response.statusText;
          try {
              const errorBody = await response.json();
              errorMsg = errorBody.message || errorMsg;
          } catch(e) { /* Ignore if body isn't JSON */ }
          throw new Error(`Error ${response.status}: ${errorMsg}`);
        }
  
        const result = await response.json(); // Expects { data: [], hasMore: boolean, currentPage: number }
  
        renderKanjiTable(result.data);
        updatePaginationControls(result.currentPage, result.hasMore);
        mensajeStatus.textContent = result.data.length > 0 ? '' : 'No se encontraron resultados.';
  
      } catch (error) {
        console.error("Error fetching Kanji data:", error);
        mensajeStatus.textContent = `Error al buscar: ${error.message}`;
        resultsTableBody.innerHTML = '<tr><td colspan="5" class="text-danger">Error al cargar datos.</td></tr>';
      }
    }
  
    // Render the table with Kanji results
    function renderKanjiTable(kanjiArray) {
      resultsTableBody.innerHTML = ''; // Clear previous results
  
      if (!kanjiArray || kanjiArray.length === 0) {
        return;
      }
  
      kanjiArray.forEach(entry => {
        const row = resultsTableBody.insertRow();
  
        // Scope attribute for table headers in HTML, data cells don't need it typically
        // ID
        row.insertCell().textContent = entry.id || '';
  
        // Kanji (linked to Jisho detail)
        const kanjiCell = row.insertCell();
        if (entry.kanji) {
          const link = document.createElement('a');
          link.href = `http://jisho.org/kanji/details/${entry.kanji}`;
          link.textContent = entry.kanji;
          link.target = '_blank'; // Open in new tab
          link.rel = 'noopener noreferrer'; // Security best practice
          kanjiCell.appendChild(link);
        }
  
        // Palabra Clave (clickable to add to composer)
        const palabraCell = row.insertCell();
        if (entry.palabra) {
           const palabraSpan = document.createElement('a');
           palabraSpan.textContent = entry.palabra;
           palabraSpan.href = "#"; // Make it look like a link
           palabraSpan.className = 'clickable-kanji';
           palabraSpan.onclick = (e) => { // Use arrow function
               e.preventDefault(); // Prevent jumping to top
               agregar(entry.kanji);
           };
           palabraCell.appendChild(palabraSpan);
        }
  
        // Componentes
        const compCell = row.insertCell();
        const componentes = [entry.comp1, entry.comp2, entry.comp3, entry.comp4, entry.comp5, entry.comp6]
          .filter(c => c) // Filter out empty/null components
          .join(', ');
        compCell.textContent = componentes;
  
        // Extra Info Button
        const extraCell = row.insertCell();
        const infoButton = document.createElement('button');
        infoButton.type = 'button';
        // Bootstrap 5 button classes
        infoButton.className = 'btn btn-info btn-sm info-button'; // Use btn-sm for smaller button
        infoButton.textContent = 'Info';
        infoButton.onclick = () => showInfo(entry); // Use arrow function
        extraCell.appendChild(infoButton);
      });
    }
  
     // Show Historia and Similares in an alert
    function showInfo(entry) {
        const historia = entry.historia || 'N/A';
        const similares = entry.similares || 'N/A';
        // Basic escaping for alert box display
        const cleanHistoria = historia.replace(/['"`]/g, "\\'");
        const cleanSimilares = similares.replace(/['"`]/g, "\\'");
        alert(`Historia: ${cleanHistoria}\n\nSimilares: ${cleanSimilares}`);
    }
  
    // Fetch Jisho data from backend proxy (triggered by 'show.bs.modal' event)
    async function solicitudApiJisho() {
      const composerValue = cajaComponer.value.trim();
      if (!composerValue) {
        modalBody.innerHTML = '<p>Escribe algo en la caja superior para buscar en Jisho.</p>';
        return;
      }
  
      const url = `${API_BASE_URL}/jisho-proxy/${encodeURIComponent(composerValue)}`;
      modalBody.innerHTML = '<p>Buscando en Jisho.org...</p>'; // Loading state
  
      try {
        const response = await fetch(url);
  
        if (!response.ok) {
           let errorMsg = response.statusText;
           try {
               const errorBody = await response.json(); // Try to get error message from Jisho proxy
               errorMsg = errorBody.message || errorMsg;
           } catch(e) { /* Ignore if body isn't JSON */ }
           throw new Error(`Error ${response.status}: ${errorMsg}`);
        }
  
        const data = await response.json();
  
        if (!data || !data.data || data.data.length === 0) {
            modalBody.innerHTML = '<p>Sin coincidencias en Jisho.org.</p>';
        } else {
            modalBody.innerHTML = formatJishoResponse(data); // Format and display
        }
  
      } catch (error) {
        console.error("Error fetching Jisho data:", error);
        modalBody.innerHTML = `<p class="text-danger">Error al contactar Jisho: ${error.message}</p>`;
      }
    }
  
    // Format Jisho API response into an HTML table string
    function formatJishoResponse(jishoData) {
        if (!jishoData || !jishoData.data) return '<p>Respuesta inválida de Jisho.</p>';
  
        // Bootstrap 5 table classes
        let tableHTML = '<div class="table-responsive"><table class="table table-sm table-striped"><thead><tr><th>Kanji/Kana</th><th>Lectura</th><th>Significado</th></tr></thead><tbody>';
        const entriesToShow = Math.min(jishoData.data.length, 4); // Show top 4 results max
  
        for (let i = 0; i < entriesToShow; i++) {
            const entry = jishoData.data[i];
            let kanjiKana = entry.japanese.map(jp => jp.word || jp.reading).join(', ');
            let reading = entry.japanese.map(jp => jp.reading).filter(r => r).join(', ');
            let meanings = entry.senses.flatMap(sense => sense.english_definitions).join('; ');
  
            tableHTML += '<tr>';
            tableHTML += `<td>${kanjiKana || 'N/A'}</td>`;
            tableHTML += `<td>${reading || 'N/A'}</td>`;
            tableHTML += `<td>${meanings || 'N/A'}</td>`;
            tableHTML += '</tr>';
        }
  
        tableHTML += '</tbody></table></div>';
        return tableHTML;
    }
  
  
    // --- Helper Functions ---
  
    // Add clicked Kanji to composer box
    function agregar(kanji) {
      if (cajaComponer && kanji) {
        cajaComponer.value += kanji;
        cajaComponer.focus(); // Keep focus on composer
      }
    }
  
    // Remove last char from composer box
    function borra1() {
      if (cajaComponer) {
        cajaComponer.value = cajaComponer.value.slice(0, -1);
        cajaComponer.focus(); // Keep focus
      }
    }
  
    // Open Google Translate in new tab
    function gtranslate() {
      if (cajaComponer && cajaComponer.value) {
        const url = `https://translate.google.es/?hl=es#ja/en/${encodeURIComponent(cajaComponer.value)}`;
        window.open(url, '_blank', 'noopener,noreferrer'); // Add rel attribute
      }
    }
  
    // --- Pagination Logic ---
    function pagMas1() {
      currentPage += 1;
      solicitudApiKanji();
    }
  
    function pagMenos1() {
      if (currentPage > 0) {
        currentPage -= 1;
        solicitudApiKanji();
      }
    }
  
    function updatePaginationControls(page, hasMore) {
        currentPage = page; // Ensure internal state matches backend state
        paginationInfo.textContent = `Página: ${currentPage}`;
        prevBtn.disabled = (currentPage <= 0);
        nextBtn.disabled = !hasMore;
    }
  
    function disablePagination() {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        paginationInfo.textContent = `Página: ${currentPage}`;
    }
  
    // --- Initial Load ---
    // Trigger an initial empty search to show all data paginated or specific message
     solicitudApiKanji();
  
  }); // End DOMContentLoaded