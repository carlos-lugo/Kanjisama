// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {

  // --- Configuration ---
  // IMPORTANT: Replace this with the actual API Gateway endpoint URL after deploying the backend
  const API_BASE_URL = 'https://r526nrw900.execute-api.ap-northeast-1.amazonaws.com';
  const ITEMS_PER_PAGE = 20; // Must match backend if calculating total pages here

  // --- Global State ---
  let currentPage = 0;
  let currentTotalPages = 0; // Store total pages

  // --- DOM Element References ---
  const cajaBusqueda = document.getElementById("caja-busqueda");
  const cajaComponer = document.getElementById("caja-componer");
  const limpiarBtn = document.getElementById('limpiar');
  const googleBtn = document.getElementById('google');
  const jishoBtn = document.getElementById('jisho-button');
  const mensajeStatus = document.getElementById('mensaje');
  const resultsTableBody = document.getElementById('kanji-table-body');
  const paginationInfo = document.getElementById('pagina');
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');

  // --- Modal Specific Elements ---
  const jishoModalElement = document.getElementById('jishoModal');
  const modalBody = document.getElementById('modal-body');

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
    currentPage = 0;
    solicitudApiKanji();
  }

  async function solicitudApiKanji() {
    const searchTerm = cajaBusqueda.value.trim();
    const searchParam = searchTerm === '' ? '_' : encodeURIComponent(searchTerm);
    const url = `${API_BASE_URL}/query/${searchParam}/${currentPage}`;

    mensajeStatus.textContent = 'Buscando...';
    resultsTableBody.innerHTML = ''; // Clear previous results
    disablePagination(); // Disable while loading

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

      // --- Expect totalItems in response ---
      const result = await response.json(); // Expects { data: [], hasMore: boolean, currentPage: number, totalItems: number }

      renderKanjiTable(result.data);
      // --- Pass totalItems to update function ---
      updatePaginationControls(result.currentPage, result.hasMore, result.totalItems);
      mensajeStatus.textContent = result.data.length > 0 ? '' : 'No se encontraron resultados.';

    } catch (error) {
      console.error("Error fetching Kanji data:", error);
      mensajeStatus.textContent = `Error al buscar: ${error.message}`;
      resultsTableBody.innerHTML = '<tr><td colspan="5" class="text-danger">Error al cargar datos.</td></tr>';
      updatePaginationControls(0, false, 0); // Reset pagination on error
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
         palabraSpan.href = "#";
         palabraSpan.className = 'clickable-kanji';
         palabraSpan.onclick = (e) => {
             e.preventDefault();
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
      infoButton.onclick = () => showInfo(entry);
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
             const errorBody = await response.json();
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
    // Check if there's actually a next page based on total pages
    if (currentPage < currentTotalPages - 1) {
        currentPage += 1;
        solicitudApiKanji();
    }
  }

  function pagMenos1() {
    if (currentPage > 0) {
      currentPage -= 1;
      solicitudApiKanji();
    }
  }

  // --- Updated function to handle totalItems ---
  function updatePaginationControls(page, hasMore, totalItems = 0) {
      currentPage = page; // Ensure internal state matches backend state
      // Calculate total pages
      currentTotalPages = (ITEMS_PER_PAGE > 0) ? Math.ceil(totalItems / ITEMS_PER_PAGE) : 0;

      // Update display (use page + 1 for user-friendly 1-based indexing)
      paginationInfo.textContent = `Página: ${totalItems > 0 ? currentPage + 1 : 0} / ${currentTotalPages}`;

      // Enable/disable buttons
      prevBtn.disabled = (currentPage <= 0);
      // Disable next button if hasMore is false OR if already on the last calculated page
      nextBtn.disabled = !hasMore || (currentPage >= currentTotalPages - 1);
  }

  // --- Updated function to reset pagination display ---
  function disablePagination() {
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      // Reset display when disabling
      paginationInfo.textContent = `Página: 0 / 0`;
      currentTotalPages = 0; // Reset total pages state
  }

  // --- Initial Load ---
   solicitudApiKanji(); // Trigger initial load

}); // End DOMContentLoaded
