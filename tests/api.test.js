const request = require('supertest');
const nock = require('nock');
const { sampleHtmlWithYale } = require('./test-utils');

// Import the actual app (it won't start a server when imported)
const { app, startServer } = require('../app');

describe('API Endpoints', () => {
  beforeAll(() => {
    // Disable real HTTP requests during testing
    nock.disableNetConnect();
    // Allow localhost connections for supertest
    nock.enableNetConnect('127.0.0.1');
  });

  afterAll(() => {
    // Clean up nock
    nock.cleanAll();
    nock.enableNetConnect();
  });

  afterEach(() => {
    // Clear any lingering nock interceptors after each test
    nock.cleanAll();
  });

  test('GET / should serve the main page', async () => {
    const response = await request(app)
      .get('/');

    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('Faleproxy');
    expect(response.text).toContain('Enter URL (e.g., https://www.yale.edu)');
  });

  test('POST /fetch should return 400 if URL is missing', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('URL is required');
  });

  test('POST /fetch should fetch and replace Yale with Fale', async () => {
    // Mock the external URL
    nock('https://example.com')
      .get('/')
      .reply(200, sampleHtmlWithYale);

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/' });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.title).toBe('Fale University Test Page');
    expect(response.body.content).toContain('Welcome to Fale University');
    expect(response.body.content).toContain('https://www.yale.edu/about');  // URL should be unchanged
    expect(response.body.content).toContain('>About Fale<');  // Link text should be changed
  });

  test('POST /fetch should handle errors from external sites', async () => {
    // Mock a failing URL
    nock('https://error-site.com')
      .get('/')
      .replyWithError('Connection refused');

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://error-site.com/' });

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toContain('Failed to fetch content');
  });

  test('startServer should start the server and call the callback', (done) => {
    // Use a different port to avoid conflicts
    const testPort = 3002;
    const server = startServer(testPort);
    
    // Verify server is listening
    expect(server.listening).toBe(true);
    
    // Close the server and call done
    server.close(() => {
      done();
    });
  });
});
