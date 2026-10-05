USE taskflow;


INSERT INTO users (name, username, email, password, role) VALUES
('Alice Johnson',  'alice', 'alice@taskflow.dev',  '$2b$10$rOzJqQ3k8gGz5X7Y2mN1aOvKpWqRtS6uLbHdEfGhIjKlMnOpQrStu', 'admin'),
('Bob Smith',      'bob', 'bob@taskflow.dev',    '$2b$10$rOzJqQ3k8gGz5X7Y2mN1aOvKpWqRtS6uLbHdEfGhIjKlMnOpQrStu', 'member'),
('Carol Williams', 'carol', 'carol@taskflow.dev',  '$2b$10$rOzJqQ3k8gGz5X7Y2mN1aOvKpWqRtS6uLbHdEfGhIjKlMnOpQrStu', 'member'),
('David Lee',      'david', 'david@taskflow.dev',  '$2b$10$rOzJqQ3k8gGz5X7Y2mN1aOvKpWqRtS6uLbHdEfGhIjKlMnOpQrStu', 'member');


INSERT INTO projects (name, description, start_date, end_date, status, created_by) VALUES
('Website Redesign',       'Complete overhaul of the company marketing website with new branding.',   '2026-09-01', '2026-12-31', 'ACTIVE',    1),
('Mobile App MVP',         'Build the first version of the iOS and Android mobile application.',       '2026-10-01', '2027-02-28', 'PLANNING',  1),
('API Integration Layer',  'Develop the middleware layer connecting all internal services.',            '2026-08-15', '2026-11-30', 'ACTIVE',    2),
('Marketing Campaign Q4',  'Digital marketing campaign for the holiday season.',                       '2026-10-15', '2026-12-25', 'PLANNING',  1),
('Legacy System Migration','Migrate old monolithic application to microservices architecture.',        '2026-07-01', '2026-10-01', 'COMPLETED', 1);

INSERT INTO tasks (project_id, title, description, priority, status, due_date, created_by, assigned_to) VALUES
(1, 'Design new homepage wireframes',   'Create Figma wireframes for the new homepage layout.',              'HIGH',   'COMPLETED',   '2026-09-15', 1, 2),
(1, 'Implement responsive navbar',      'Build a fully responsive top navigation component in React.',        'HIGH',   'COMPLETED',   '2026-09-20', 1, 3),
(1, 'Create hero section',             'Animated hero banner with CTA buttons and background gradient.',     'MEDIUM', 'IN_PROGRESS', '2026-10-10', 1, 2),
(1, 'SEO meta tags setup',             'Add proper meta tags, OG tags, and structured data.',               'LOW',    'TODO',        '2026-10-20', 1, NULL),
(1, 'Cross-browser testing',           'Test on Chrome, Firefox, Safari, and Edge.',                        'MEDIUM', 'TODO',        '2026-11-01', 1, 3),

(2, 'Define app architecture',         'Document tech stack, folder structure, and state management.',       'HIGH',   'IN_PROGRESS', '2026-10-15', 1, 1),
(2, 'Authentication screens',          'Login, register, and forgot-password UI screens.',                  'HIGH',   'TODO',        '2026-10-25', 1, 2),
(2, 'Push notification setup',         'Integrate Firebase Cloud Messaging for push notifications.',         'MEDIUM', 'TODO',        '2026-11-10', 1, NULL),

(3, 'Auth service integration',        'Connect third-party OAuth provider to auth service.',               'HIGH',   'COMPLETED',   '2026-09-01', 2, 4),
(3, 'Rate limiting middleware',        'Implement Redis-based rate limiting on all public endpoints.',       'HIGH',   'IN_PROGRESS', '2026-10-05', 2, 2),
(3, 'API documentation',               'Write full OpenAPI 3.0 spec for all endpoints.',                    'MEDIUM', 'TODO',        '2026-10-20', 2, 3),

(4, 'Content calendar',                'Plan content calendar for Oct-Dec social media posts.',              'MEDIUM', 'TODO',        '2026-10-20', 1, NULL),
(4, 'Email template design',           'Design HTML email templates for campaign newsletters.',              'HIGH',   'TODO',        '2026-10-25', 1, 3),

(5, 'Audit existing codebase',        'Document all modules and dependencies in the monolith.',             'HIGH',   'COMPLETED',   '2026-07-15', 1, 4),
(5, 'Database schema migration',       'Extract and migrate database to separate microservice DBs.',         'HIGH',   'COMPLETED',   '2026-08-30', 1, 2),
(5, 'Deploy containerised services',  'Push all services to Kubernetes cluster and validate.',              'HIGH',   'COMPLETED',   '2026-09-30', 1, 1);
