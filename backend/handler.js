'use strict';

// Load the Kanji data - Node.js caches this after first load
const kanjiData = require('./kanji_data.json');
const fetch = require('node-fetch');

const ITEMS_PER_PAGE = 20;

module.exports.queryKanji = async (event) => {
  try {
    const term = event.pathParameters.term ? decodeURIComponent(event.pathParameters.term).toLowerCase() : '';
    const page = event.pathParameters.page ? parseInt(event.pathParameters.page, 10) : 0;

    let results = [];
    if (term) {
      results = kanjiData.filter(entry =>
        entry.kanji?.toLowerCase().includes(term) ||
        entry.palabra?.toLowerCase().includes(term) ||
        entry.comp1?.toLowerCase().includes(term) ||
        entry.comp2?.toLowerCase().includes(term) ||
        entry.comp3?.toLowerCase().includes(term) ||
        entry.comp4?.toLowerCase().includes(term) ||
        entry.comp5?.toLowerCase().includes(term) ||
        entry.comp6?.toLowerCase().includes(term) ||
        entry.historia?.toLowerCase().includes(term) ||
        entry.similares?.toLowerCase().includes(term)
      );
    } else {
      results = kanjiData;
    }

    const startIndex = page * ITEMS_PER_PAGE;
    const paginatedResults = results.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Check if there are more pages
    const hasMore = results.length > (startIndex + ITEMS_PER_PAGE);

    return {
      statusCode: 200,
      headers: { // CORS headers handled by API Gateway (cors: true)
         // 'Access-Control-Allow-Origin': '*', // Not needed if API Gateway handles CORS
         // 'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
          data: paginatedResults,
          hasMore: hasMore,
          currentPage: page
      }),
    };
  } catch (error) {
    console.error("Error in queryKanji:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};

module.exports.proxyJisho = async (event) => {
  try {
    const term = event.pathParameters.term ? encodeURIComponent(event.pathParameters.term) : '';
    if (!term) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing search term'}) };
    }

    const jishoUrl = `https://jisho.org/api/v1/search/words?keyword=${term}`;
    const response = await fetch(jishoUrl);

    if (!response.ok) {
      console.error(`Jisho API error: ${response.status} ${response.statusText}`);
      return { statusCode: response.status, body: JSON.stringify({ message: 'Error fetching from Jisho API'}) };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error in proxyJisho:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error proxying Jisho' }),
    };
  }
};