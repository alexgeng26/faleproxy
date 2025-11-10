const request = require('supertest');
const cheerio = require('cheerio');
const { sampleHtmlWithYale } = require('./test-utils');
const nock = require('nock');

// Import the actual app (it won't start a server when imported)
const { app } = require('../app');

describe('Integration Tests', () => {
  beforeAll(() => {
    // Mock external HTTP requests
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test('Should replace Yale with Fale in fetched content', async () => {
    // Setup mock for example.com
    nock('https://example.com')
      .get('/')
      .reply(200, sampleHtmlWithYale);
    
    // Make a request to our proxy app
    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/' });
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    
    // Verify Yale has been replaced with Fale in text
    const $ = cheerio.load(response.body.content);
    expect($('title').text()).toBe('Fale University Test Page');
    expect($('h1').text()).toBe('Welcome to Fale University');
    expect($('p').first().text()).toContain('Fale University is a private');
    
    // Verify URLs remain unchanged
    const links = $('a');
    let hasYaleUrl = false;
    links.each((i, link) => {
      const href = $(link).attr('href');
      if (href && href.includes('yale.edu')) {
        hasYaleUrl = true;
      }
    });
    expect(hasYaleUrl).toBe(true);
    
    // Verify link text is changed
    expect($('a').first().text()).toBe('About Fale');
  });

  test('Should handle invalid URLs', async () => {
    nock('https://not-a-valid-url')
      .get('/')
      .replyWithError('getaddrinfo ENOTFOUND not-a-valid-url');
    
    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://not-a-valid-url' });
    
    expect(response.statusCode).toBe(500);
    expect(response.body.error).toContain('Failed to fetch content');
  });

  test('Should handle missing URL parameter', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({});
    
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('URL is required');
  });
});
