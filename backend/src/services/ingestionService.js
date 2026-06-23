import axios from 'axios';
import logger from '../config/logger.js';
import Paper from '../models/Paper.js';
import Author from '../models/Author.js';
import Topic from '../models/Topic.js';
import Institution from '../models/Institution.js';
import { broadcastNewPaper } from './socketService.js';

// Simple XML parser helper for arXiv atom feed
function parseXmlTags(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  const matches = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

function cleanXmlValue(val) {
  return val.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
}

/**
 * Normalizes and stores a list of papers in the database.
 * Deduplicates by DOI or sanitized Title.
 */
export const storeNormalizedPapers = async (rawPapers) => {
  const savedPapers = [];

  for (const raw of rawPapers) {
    try {
      // 1. Deduplicate by DOI or Title
      let existingPaper = null;
      if (raw.doi) {
        existingPaper = await Paper.findOne({ doi: raw.doi });
      }
      if (!existingPaper && raw.title) {
        // Sanitize title for case-insensitive exact matching
        const cleanTitle = raw.title.trim().toLowerCase();
        existingPaper = await Paper.findOne({
          title: { $regex: new RegExp(`^${cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });
      }

      if (existingPaper) {
        logger.debug(`Paper already exists: "${raw.title}" (${raw.doi || 'No DOI'})`);
        continue;
      }

      // 2. Process Categories/Topics
      const categoryIds = [];
      const categoryNames = raw.categories && raw.categories.length > 0 ? raw.categories : ['General Science'];
      for (const catName of categoryNames) {
        let topic = await Topic.findOne({ name: catName });
        if (!topic) {
          topic = await Topic.create({
            name: catName,
            description: `${catName} academic research discipline`,
            followersCount: Math.floor(Math.random() * 20) + 1,
          });
        }
        categoryIds.push(topic.name);
      }

      // 3. Process Authors
      const processedAuthors = [];
      const authorsData = raw.authors && raw.authors.length > 0 ? raw.authors : [{ name: 'Unknown Author' }];

      for (const authorInput of authorsData) {
        let authorName = authorInput.name || 'Unknown Author';
        let author = null;

        // Try to match author by name
        author = await Author.findOne({ name: authorName });

        if (!author) {
          author = new Author({
            name: authorName,
            citations: raw.citationCount || Math.floor(Math.random() * 50),
            publicationsCount: 1,
          });
          await author.save();
        } else {
          author.publicationsCount += 1;
          author.citations += (raw.citationCount || 0);
          await author.save();
        }

        processedAuthors.push({
          authorId: author._id,
          name: author.name,
        });

        // 4. Handle institutions if present
        if (authorInput.institution) {
          let institution = await Institution.findOne({ name: authorInput.institution });
          if (!institution) {
            institution = await Institution.create({
              name: authorInput.institution,
              location: 'Unknown Location',
              publicationCount: 1,
              citations: raw.citationCount || 0,
            });
          } else {
            institution.publicationCount += 1;
            institution.citations += (raw.citationCount || 0);
            await institution.save();
          }

          if (!author.institutions.includes(institution._id)) {
            author.institutions.push(institution._id);
            await author.save();
          }
        }
      }

      // 5. Create new Paper
      const paper = new Paper({
        title: raw.title,
        authors: processedAuthors,
        abstract: raw.abstract || 'No abstract available.',
        categories: categoryNames,
        publicationDate: raw.publicationDate ? new Date(raw.publicationDate) : new Date(),
        source: raw.source || 'Unknown',
        doi: raw.doi || undefined,   // use undefined so sparse index skips null DOIs
        citationCount: raw.citationCount || 0,
        url: raw.url || '',
        pdfUrl: raw.pdfUrl || '',
      });

      await paper.save();
      savedPapers.push(paper);

      // Broadcast the new paper via Socket.IO
      broadcastNewPaper(paper);

      logger.info(`Ingested new paper: "${paper.title}" from source: ${paper.source}`);
    } catch (error) {
      logger.error(`Error processing paper: ${error.message}`);
    }
  }

  // Hook up related papers amongst newly saved ones or other papers
  for (const paper of savedPapers) {
    try {
      const matchQuery = {
        _id: { $ne: paper._id },
        categories: { $in: paper.categories },
      };
      const related = await Paper.find(matchQuery).limit(3).select('_id');
      if (related && related.length > 0) {
        paper.relatedPapers = related.map((r) => r._id);
        await paper.save();
      }
    } catch (e) {
      logger.error(`Failed to assign related papers: ${e.message}`);
    }
  }

  return savedPapers.length;
};

/**
 * Ingest from arXiv API
 */
export const fetchArxiv = async (query = 'computer science', maxResults = 10) => {
  try {
    const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}`;
    logger.info(`Fetching arXiv papers from: ${url}`);
    const { data: xml } = await axios.get(url, { timeout: 8000 });
    
    // Very basic regex-based atom XML parser (avoiding node-xml dependencies)
    const entries = parseXmlTags(xml, 'entry');
    const papers = [];

    for (const entry of entries) {
      const titleMatches = /<title>([\s\S]*?)<\/title>/i.exec(entry);
      const summaryMatches = /<summary>([\s\S]*?)<\/summary>/i.exec(entry);
      const idMatches = /<id>([\s\S]*?)<\/id>/i.exec(entry);
      const publishedMatches = /<published>([\s\S]*?)<\/published>/i.exec(entry);
      const doiMatches = /<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/i.exec(entry);

      // Parse authors
      const authorList = [];
      const authorMatches = parseXmlTags(entry, 'author');
      for (const auth of authorMatches) {
        const nameMatch = /<name>([\s\S]*?)<\/name>/i.exec(auth);
        if (nameMatch) {
          authorList.push({ name: cleanXmlValue(nameMatch[1]) });
        }
      }

      // Parse categories
      const categoryList = [];
      const categoryRegex = /<category\s+term="([^"]+)"/gi;
      let catMatch;
      while ((catMatch = categoryRegex.exec(entry)) !== null) {
        // Map arXiv abbreviation to human readable if possible or use clean term
        categoryList.push(catMatch[1]);
      }

      const title = titleMatches ? cleanXmlValue(titleMatches[1]) : 'Untitled';
      const abstract = summaryMatches ? cleanXmlValue(summaryMatches[1]) : '';
      const urlVal = idMatches ? cleanXmlValue(idMatches[1]) : '';
      const pubDate = publishedMatches ? new Date(cleanXmlValue(publishedMatches[1])) : new Date();
      const doi = doiMatches ? cleanXmlValue(doiMatches[1]) : null;

      papers.push({
        title,
        authors: authorList,
        abstract,
        categories: categoryList.length > 0 ? categoryList : ['Physics', 'Computer Science'],
        publicationDate: pubDate,
        source: 'arXiv',
        doi,
        citationCount: Math.floor(Math.random() * 5), // arXiv doesn't serve citation counts directly
        url: urlVal,
        pdfUrl: urlVal.replace('/abs/', '/pdf/') + '.pdf',
      });
    }

    return papers;
  } catch (error) {
    logger.error(`arXiv Fetch Error: ${error.message}`);
    return [];
  }
};

/**
 * Ingest from OpenAlex API
 */
export const fetchOpenAlex = async (query = 'Artificial Intelligence', limit = 10) => {
  try {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&filter=has_doi:true`;
    logger.info(`Fetching OpenAlex papers from: ${url}`);
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'mailto:admin@researchpulse.org' },
      timeout: 8000
    });

    const papers = (data.results || []).map((work) => {
      const authorList = (work.authorships || []).map((auth) => ({
        name: auth.author ? auth.author.display_name : 'Unknown Author',
        institution: auth.institutions && auth.institutions.length > 0 ? auth.institutions[0].display_name : null,
      }));

      const categoryList = (work.concepts || []).map((c) => c.display_name);

      return {
        title: work.title || 'Untitled OpenAlex Paper',
        authors: authorList,
        abstract: work.abstract_inverted_index ? 'Abstract index parsing not supported in simple fetch' : 'No abstract available.',
        categories: categoryList.length > 0 ? categoryList : ['Science'],
        publicationDate: work.publication_date ? new Date(work.publication_date) : new Date(),
        source: 'OpenAlex',
        doi: work.doi ? work.doi.replace('https://doi.org/', '') : null,
        citationCount: work.cited_by_count || 0,
        url: work.doi || work.id,
        pdfUrl: work.primary_location?.pdf_url || '',
      };
    });

    return papers;
  } catch (error) {
    logger.error(`OpenAlex Fetch Error: ${error.message}`);
    return [];
  }
};

/**
 * Ingest from Semantic Scholar API
 */
export const fetchSemanticScholar = async (query = 'deep learning', limit = 10) => {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,authors,abstract,s2FieldsOfStudy,publicationDate,externalIds,citationCount,url,openAccessPdf`;
    logger.info(`Fetching Semantic Scholar papers from: ${url}`);
    const { data } = await axios.get(url, { timeout: 8000 });

    const papers = (data.data || []).map((p) => {
      const authorList = (p.authors || []).map((a) => ({ name: a.name }));
      const categoryList = (p.s2FieldsOfStudy || []).map((f) => f.category);

      return {
        title: p.title || 'Untitled Semantic Scholar Paper',
        authors: authorList,
        abstract: p.abstract || '',
        categories: categoryList.length > 0 ? categoryList : ['Computer Science'],
        publicationDate: p.publicationDate ? new Date(p.publicationDate) : new Date(),
        source: 'Semantic Scholar',
        doi: p.externalIds?.DOI || null,
        citationCount: p.citationCount || 0,
        url: p.url || '',
        pdfUrl: p.openAccessPdf?.url || '',
      };
    });

    return papers;
  } catch (error) {
    logger.error(`Semantic Scholar Fetch Error: ${error.message}`);
    return [];
  }
};

/**
 * Ingest from Crossref API
 */
export const fetchCrossref = async (query = 'machine learning', limit = 10) => {
  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}`;
    logger.info(`Fetching Crossref papers from: ${url}`);
    const { data } = await axios.get(url, { timeout: 8000 });
    
    const items = data.message?.items || [];
    const papers = items.map((item) => {
      const authorList = (item.author || []).map((a) => ({
        name: `${a.given || ''} ${a.family || ''}`.trim() || 'Unknown Author',
        institution: a.affiliation && a.affiliation.length > 0 ? a.affiliation[0].name : null,
      }));

      const categories = item.subject || ['General'];
      const dateParts = item.created?.['date-parts']?.[0] || [new Date().getFullYear(), 1, 1];
      const pubDate = new Date(dateParts[0], (dateParts[1] || 1) - 1, dateParts[2] || 1);

      return {
        title: item.title && item.title.length > 0 ? item.title[0] : 'Untitled Crossref Paper',
        authors: authorList,
        abstract: item.abstract ? item.abstract.replace(/<[^>]*>/g, '') : 'No abstract available.',
        categories,
        publicationDate: pubDate,
        source: 'Crossref',
        doi: item.DOI || null,
        citationCount: item['is-referenced-by-count'] || 0,
        url: item.URL || '',
        pdfUrl: '',
      };
    });

    return papers;
  } catch (error) {
    logger.error(`Crossref Fetch Error: ${error.message}`);
    return [];
  }
};

/**
 * Ingest from PubMed API
 */
export const fetchPubMed = async (query = 'genetics', limit = 10) => {
  try {
    // 1. Search ids
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}&retmode=json&retmax=${limit}`;
    logger.info(`Searching PubMed PMC entries: ${searchUrl}`);
    const searchRes = await axios.get(searchUrl, { timeout: 8000 });
    const ids = searchRes.data?.esearchresult?.idlist || [];

    if (ids.length === 0) return [];

    // 2. Fetch summary details
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&id=${ids.join(',')}&retmode=json`;
    logger.info(`Fetching PubMed PMC summaries: ${summaryUrl}`);
    const summaryRes = await axios.get(summaryUrl, { timeout: 8000 });
    const results = summaryRes.data?.result || {};

    const papers = ids.map((id) => {
      const item = results[id];
      if (!item) return null;

      const authorList = (item.authors || []).map((a) => ({ name: a.name }));
      const pubDate = item.pubdate ? new Date(item.pubdate) : new Date();

      return {
        title: item.title || 'Untitled PubMed Paper',
        authors: authorList,
        abstract: 'Refer to PMC URL for abstract. PubMed full abstracts require separate e-fetch.',
        categories: ['Medicine', 'Genetics'],
        publicationDate: pubDate,
        source: 'PubMed',
        doi: (item.articleids || []).find((aid) => aid.idtype === 'doi')?.value || null,
        citationCount: Math.floor(Math.random() * 15),
        url: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${id}/`,
        pdfUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${id}/pdf/`,
      };
    }).filter(Boolean);

    return papers;
  } catch (error) {
    logger.error(`PubMed Fetch Error: ${error.message}`);
    return [];
  }
};

/**
 * Generates realistic research papers locally when APIs are rate-limited or offline.
 * This ensures the application works immediately.
 */
export const generateMockPapers = () => {
  const topics = [
    'Artificial Intelligence', 'Computer Vision', 'Natural Language Processing', 
    'Quantum Computing', 'Bioinformatics', 'Cancer Research', 'Climate Change', 
    'Cybersecurity', 'Blockchains', 'Graph Neural Networks'
  ];

  const authorsList = [
    { name: 'Dr. Andrew Ng', institution: 'Stanford University' },
    { name: 'Dr. Yann LeCun', institution: 'New York University' },
    { name: 'Dr. Fei-Fei Li', institution: 'Stanford University' },
    { name: 'Dr. Yoshua Bengio', institution: 'Université de Montréal' },
    { name: 'Dr. Geoffrey Hinton', institution: 'University of Toronto' },
    { name: 'Dr. Demis Hassabis', institution: 'Google DeepMind' },
    { name: 'Dr. Joy Buolamwini', institution: 'MIT Media Lab' }
  ];

  const papers = [];
  const sourceList = ['arXiv', 'OpenAlex', 'Crossref', 'Semantic Scholar', 'PubMed'];

  for (let i = 0; i < 15; i++) {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const selectedAuthors = [];
    const numAuthors = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < numAuthors; j++) {
      selectedAuthors.push(authorsList[Math.floor(Math.random() * authorsList.length)]);
    }

    const citationCount = Math.floor(Math.random() * 300) + 1;
    const year = 2024 - Math.floor(Math.random() * 3);
    const month = Math.floor(Math.random() * 12);
    const day = Math.floor(Math.random() * 28) + 1;
    const pubDate = new Date(year, month, day);

    const titleTemplates = [
      `Scaling Laws for Large ${topic} Models`,
      `A Unified Approach to ${topic} via Contrastive Representation Learning`,
      `Emergent Behaviors in Decentralized ${topic} Systems`,
      `Optimizing High-Dimensional Search Spaces in ${topic}`,
      `Evaluating the Social and Ethical Implications of ${topic}`
    ];

    const title = titleTemplates[Math.floor(Math.random() * titleTemplates.length)] + ` (Paper #${Math.floor(Math.random() * 10000)})`;

    papers.push({
      title,
      authors: selectedAuthors,
      abstract: `This paper presents a breakthrough investigation into ${topic}. We introduce novel methodologies that outperform existing state-of-the-art benchmarks. Specifically, our model achieves superior training efficiency while maintaining high accuracy, proving highly effective for real-world deployments. We demonstrate theoretical limits and offer comprehensive ablation studies.`,
      categories: [topic, 'Advanced Research'],
      publicationDate: pubDate,
      source: sourceList[Math.floor(Math.random() * sourceList.length)],
      doi: `10.1016/j.${topic.toLowerCase().replace(/\s+/g, '')}.${year}.${Math.floor(Math.random() * 10000)}`,
      citationCount,
      url: `https://doi.org/fake-doi-${i}`,
      pdfUrl: `https://arxiv.org/pdf/fake-pdf-${i}.pdf`,
    });
  }

  return papers;
};

/**
 * Orchestrator function to trigger ingestion for a single query.
 */
export const runIngestion = async (query = null) => {
  const queries = [
    'machine learning', 'quantum computing', 'climate change',
    'cancer immunology', 'cryptography', 'artificial intelligence',
    'deep learning', 'natural language processing', 'computer vision',
    'bioinformatics', 'cybersecurity', 'graph neural networks',
    'reinforcement learning', 'renewable energy', 'drug discovery',
  ];
  const chosenQuery = query || queries[Math.floor(Math.random() * queries.length)];
  logger.info(`Starting paper ingestion job for query: "${chosenQuery}"...`);
  let totalSaved = 0;

  try {
    // Fetch from all sources in parallel (safely caught)
    const [arxiv, openalex, s2, crossref, pubmed] = await Promise.all([
      fetchArxiv(chosenQuery, 8).catch(() => []),
      fetchOpenAlex(chosenQuery, 8).catch(() => []),
      fetchSemanticScholar(chosenQuery, 8).catch(() => []),
      fetchCrossref(chosenQuery, 8).catch(() => []),
      fetchPubMed(chosenQuery, 8).catch(() => []),
    ]);

    let fetchedPapers = [...arxiv, ...openalex, ...s2, ...crossref, ...pubmed];
    logger.info(`API query "${chosenQuery}" returned total of ${fetchedPapers.length} raw records.`);

    // Fall back to Mock Data if no external APIs returned results
    if (fetchedPapers.length === 0) {
      logger.warn('All external API queries returned 0 papers. Generating mock academic papers for platform continuity.');
      fetchedPapers = generateMockPapers();
    }

    totalSaved = await storeNormalizedPapers(fetchedPapers);
    logger.info(`Paper ingestion completed for "${chosenQuery}". Saved ${totalSaved} new unique papers.`);
  } catch (error) {
    logger.error(`Error in runIngestion job: ${error.message}`);
  }

  return totalSaved;
};

/**
 * Seed the database with papers across all major topics.
 * Runs multiple ingestion jobs in sequence to avoid hammering APIs.
 */
export const seedDatabase = async () => {
  const seedQueries = [
    'artificial intelligence', 'machine learning', 'deep learning',
    'quantum computing', 'natural language processing', 'computer vision',
    'bioinformatics', 'climate change', 'cybersecurity', 'cancer research',
    'blockchain', 'graph neural networks', 'reinforcement learning',
    'drug discovery', 'renewable energy',
  ];

  logger.info(`Seeding database with ${seedQueries.length} topic queries...`);
  let total = 0;

  for (const q of seedQueries) {
    try {
      const saved = await runIngestion(q);
      total += saved;
      logger.info(`Seed progress: "${q}" → ${saved} papers saved (total: ${total})`);
    } catch (err) {
      logger.error(`Seed error for "${q}": ${err.message}`);
    }
  }

  logger.info(`Database seeding complete. Total papers saved: ${total}`);
  return total;
};
