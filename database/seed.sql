USE taskflow;

INSERT INTO users (name, username, email, password, role) VALUES
('Alice Johnson',  'alice', 'alice@taskflow.dev', '$2b$10$VbMsNCBKpLeiUmcLJiEOHuOJxpL01UiVzALZkJTAMzrAiIoMfMSUm', 'admin'),
('Bob Smith',      'bob',   'bob@taskflow.dev',   '$2b$10$VbMsNCBKpLeiUmcLJiEOHuOJxpL01UiVzALZkJTAMzrAiIoMfMSUm', 'admin'),
('Carol Williams', 'carol', 'carol@taskflow.dev', '$2b$10$VbMsNCBKpLeiUmcLJiEOHuOJxpL01UiVzALZkJTAMzrAiIoMfMSUm', 'member'),
('David Lee',      'david', 'david@taskflow.dev', '$2b$10$VbMsNCBKpLeiUmcLJiEOHuOJxpL01UiVzALZkJTAMzrAiIoMfMSUm', 'member'),
('Eva Martinez',   'eva',   'eva@taskflow.dev',   '$2b$10$VbMsNCBKpLeiUmcLJiEOHuOJxpL01UiVzALZkJTAMzrAiIoMfMSUm', 'member'),
('Frank Chen',     'frank', 'frank@taskflow.dev', '$2b$10$VbMsNCBKpLeiUmcLJiEOHuOJxpL01UiVzALZkJTAMzrAiIoMfMSUm', 'member'),
('Grace Kim',      'grace', 'grace@taskflow.dev', '$2b$10$VbMsNCBKpLeiUmcLJiEOHuOJxpL01UiVzALZkJTAMzrAiIoMfMSUm', 'member');


INSERT INTO projects (name, description, start_date, end_date, status, created_by) VALUES
('Website Redesign',        'Complete overhaul of the company marketing website with new branding and improved UX.',           '2026-09-01', '2026-12-31', 'ACTIVE',    1),
('Mobile App MVP',          'Build the first release of the iOS and Android mobile application.',                              '2026-10-01', '2027-02-28', 'PLANNING',  1),
('API Integration Layer',   'Develop the middleware layer connecting all internal micro-services.',                            '2026-08-15', '2026-11-30', 'ACTIVE',    2),
('Marketing Campaign Q4',   'Digital marketing push for the holiday season across email, social, and paid ads.',              '2026-10-15', '2026-12-25', 'PLANNING',  1),
('Legacy System Migration', 'Migrate the old monolithic application to a micro-services architecture on Kubernetes.',         '2026-07-01', '2026-10-01', 'COMPLETED', 1),
('Data Analytics Dashboard','Internal BI dashboard surfacing KPIs for product, sales, and support teams.',                   '2026-09-15', '2027-01-31', 'ON_HOLD',   2);


INSERT INTO project_members (project_id, user_id, role) VALUES
(1, 1, 'MANAGER'),
(1, 3, 'MEMBER'),
(1, 4, 'MEMBER'),
(1, 7, 'VIEWER'),
(2, 1, 'MANAGER'),
(2, 5, 'MEMBER'),
(2, 6, 'MEMBER'),
(3, 2, 'MANAGER'),
(3, 4, 'MEMBER'),
(3, 3, 'MEMBER'),
(3, 7, 'VIEWER'),
(4, 1, 'MANAGER'),
(4, 5, 'MEMBER'),
(4, 7, 'MEMBER'),
(5, 1, 'MANAGER'),
(5, 2, 'MEMBER'),
(5, 4, 'MEMBER'),
(5, 6, 'VIEWER'),
(6, 2, 'MANAGER'),
(6, 5, 'MEMBER'),
(6, 6, 'MEMBER');


INSERT INTO project_invitations (project_id, invited_user_id, invited_by, role, status, responded_at) VALUES
(1, 5, 1, 'MEMBER', 'PENDING',  NULL),
(2, 7, 1, 'MEMBER', 'PENDING',  NULL),
(3, 6, 2, 'VIEWER', 'PENDING',  NULL),
(4, 3, 1, 'MEMBER', 'PENDING',  NULL),
(1, 6, 1, 'VIEWER', 'ACCEPTED', '2026-09-05 10:00:00'),
(3, 3, 2, 'MEMBER', 'ACCEPTED', '2026-08-20 09:30:00'),
(5, 4, 1, 'MEMBER', 'ACCEPTED', '2026-07-03 14:00:00'),
(2, 4, 1, 'MEMBER', 'DECLINED', '2026-10-03 11:45:00'),
(6, 3, 2, 'MEMBER', 'DECLINED', '2026-09-17 16:20:00');


INSERT INTO tasks (project_id, title, description, priority, status, due_date, created_by, assigned_to) VALUES
(1, 'Design homepage wireframes',    'Create high-fidelity Figma wireframes for the new homepage layout.',                               'HIGH',   'COMPLETED',   '2026-09-15', 1, 3),
(1, 'Implement responsive navbar',   'Build a fully responsive top navigation component in React with mobile drawer.',                   'HIGH',   'COMPLETED',   '2026-09-20', 1, 4),
(1, 'Build hero section',            'Animated hero banner with CTA buttons, background gradient, and video fallback.',                  'MEDIUM', 'IN_PROGRESS', '2026-10-10', 1, 3),
(1, 'SEO meta-tag setup',            'Add proper meta, Open Graph, Twitter Card, and JSON-LD structured-data tags.',                    'LOW',    'TODO',        '2026-10-20', 1, NULL),
(1, 'Cross-browser testing',         'Verify layout and interactions on Chrome, Firefox, Safari, and Edge.',                            'MEDIUM', 'TODO',        '2026-11-10', 1, 4),
(1, 'Performance audit',             'Run Lighthouse and fix issues to achieve a score of 90+ on all metrics.',                         'HIGH',   'TODO',        '2026-11-20', 1, 3),
(1, 'Accessibility review',          'Ensure WCAG 2.1 AA compliance — keyboard nav, ARIA roles, colour contrast.',                      'MEDIUM', 'TODO',        '2026-11-25', 1, NULL),
(2, 'Define app architecture',       'Document tech stack, folder structure, navigation library, and state management.',                 'HIGH',   'IN_PROGRESS', '2026-10-15', 1, 5),
(2, 'Authentication screens',        'Design and implement login, register, and forgot-password screens.',                               'HIGH',   'TODO',        '2026-10-25', 1, 6),
(2, 'Push notification setup',       'Integrate Firebase Cloud Messaging; handle foreground and background payloads.',                   'MEDIUM', 'TODO',        '2026-11-10', 1, NULL),
(2, 'Offline mode support',          'Cache API responses with React Query and sync when connectivity is restored.',                     'LOW',    'TODO',        '2026-11-30', 1, 5),
(2, 'App Store submission prep',     'Prepare screenshots, privacy policy, age rating, and TestFlight build.',                          'HIGH',   'TODO',        '2027-01-31', 1, 6),
(3, 'OAuth service integration',     'Connect third-party OAuth 2.0 provider; handle token refresh lifecycle.',                         'HIGH',   'COMPLETED',   '2026-09-01', 2, 4),
(3, 'Rate-limiting middleware',      'Implement Redis-based sliding-window rate limiting on all public endpoints.',                      'HIGH',   'IN_PROGRESS', '2026-10-05', 2, 3),
(3, 'OpenAPI 3.0 documentation',     'Write complete spec for every endpoint; publish via Swagger UI.',                                 'MEDIUM', 'TODO',        '2026-10-20', 2, 4),
(3, 'Webhook event system',          'Build a reliable outbound webhook dispatcher with retry and delivery logs.',                       'HIGH',   'TODO',        '2026-11-01', 2, 3),
(3, 'Integration test suite',        'Achieve 80%+ branch coverage on all service adapters using Jest and Supertest.',                  'MEDIUM', 'TODO',        '2026-11-15', 2, NULL),
(4, 'Content calendar',              'Plan Oct-Dec social-media post schedule across LinkedIn, Twitter, and Instagram.',                 'MEDIUM', 'IN_PROGRESS', '2026-10-20', 1, 5),
(4, 'Email template design',         'Design responsive HTML email templates for campaign newsletters (3 variants).',                   'HIGH',   'TODO',        '2026-10-25', 1, 7),
(4, 'Paid-ads creative assets',      'Produce static and animated banner assets in all required ad-network sizes.',                     'HIGH',   'TODO',        '2026-11-05', 1, 5),
(4, 'UTM tracking setup',            'Configure UTM parameters and verify Google Analytics 4 event tracking.',                         'LOW',    'TODO',        '2026-11-10', 1, NULL),
(4, 'Post-campaign report template', 'Build a Looker Studio template for end-of-campaign performance reporting.',                       'LOW',    'TODO',        '2026-12-20', 1, 7),
(5, 'Audit existing codebase',       'Document all modules, third-party libraries, and inter-service dependencies.',                    'HIGH',   'COMPLETED',   '2026-07-15', 1, 4),
(5, 'Database schema migration',     'Extract and migrate relational data into separate per-service databases.',                        'HIGH',   'COMPLETED',   '2026-08-30', 1, 3),
(5, 'Containerise services',         'Dockerise every micro-service and publish images to the internal registry.',                      'HIGH',   'COMPLETED',   '2026-09-15', 1, 6),
(5, 'Deploy to Kubernetes cluster',  'Apply Helm charts, validate rolling updates, and confirm zero-downtime deploys.',                 'HIGH',   'COMPLETED',   '2026-09-30', 1, 4),
(5, 'Decommission monolith',         'Redirect traffic, archive the repo, and shut down old infrastructure.',                          'MEDIUM', 'COMPLETED',   '2026-10-01', 1, 2),
(6, 'Requirements gathering',        'Run discovery sessions with product, sales, and support leads to capture KPIs.',                  'HIGH',   'COMPLETED',   '2026-09-30', 2, 5),
(6, 'Data-warehouse schema design',  'Model fact and dimension tables in BigQuery for the core reporting entities.',                    'HIGH',   'IN_PROGRESS', '2026-10-20', 2, 6),
(6, 'Dashboard UI prototyping',      'Build low-fidelity prototype in Figma; collect stakeholder sign-off.',                           'MEDIUM', 'TODO',        '2026-11-15', 2, 5),
(6, 'Embed Looker Studio reports',   'Integrate pre-built Looker Studio reports inside the internal portal via iframe.',                'LOW',    'TODO',        '2026-12-01', 2, NULL);
