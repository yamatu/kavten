-- Player showcase / community forum.
-- AutoMigrate creates these tables on boot (see config.MigratedModels); this file
-- exists so a database restored without AutoMigrate can be brought up to date and
-- so the starter threads are reproducible.
-- Idempotent: safe to run more than once.

CREATE TABLE IF NOT EXISTS community_posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT NULL,
  body LONGTEXT NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'build-log',
  tags VARCHAR(500) NULL,
  author_name VARCHAR(120) NOT NULL,
  author_email VARCHAR(255) NULL,
  author_location VARCHAR(120) NULL,
  author_badge VARCHAR(60) NULL,
  customer_id BIGINT UNSIGNED NULL,
  images JSON NULL,
  video_url VARCHAR(500) NULL,
  product_slug VARCHAR(255) NULL,
  product_name VARCHAR(255) NULL,
  build_hours VARCHAR(60) NULL,
  difficulty VARCHAR(40) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  is_pinned TINYINT(1) NOT NULL DEFAULT 0,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  likes_count INT NOT NULL DEFAULT 0,
  views_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_community_posts_slug (slug),
  KEY idx_community_posts_category (category),
  KEY idx_community_posts_status (status),
  KEY idx_community_posts_customer_id (customer_id),
  KEY idx_community_posts_is_pinned (is_pinned),
  KEY idx_community_posts_is_featured (is_featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  author_name VARCHAR(120) NOT NULL,
  author_email VARCHAR(255) NULL,
  author_badge VARCHAR(60) NULL,
  customer_id BIGINT UNSIGNED NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  likes_count INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_community_comments_post_id (post_id),
  KEY idx_community_comments_parent_id (parent_id),
  KEY idx_community_comments_customer_id (customer_id),
  KEY idx_community_comments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Starter threads. These are written by the store, not by customers, so they are
-- labelled "Kavten Team" and never carry a customer name or purchase badge.
INSERT INTO community_posts
  (slug, title, excerpt, body, category, tags, author_name, author_badge, status, is_pinned, is_featured, created_at, updated_at)
SELECT * FROM (SELECT
  'welcome-to-the-kavten-builders-workshop' AS slug,
  'Welcome to the Kavten Builders'' Workshop' AS title,
  'Where owners share first starts, tuning notes, paint jobs and the small fixes that turn a kit into a keeper.' AS excerpt,
  'This board exists for one reason: a model engine is more fun once it actually runs, and the fastest way to get there is to copy someone who already did it.\n\n**What belongs here**\n\n- Build logs from unboxing to first start, including the parts that went wrong.\n- Tuning notes: needle settings, ignition timing, valve lash, break-in hours you actually logged.\n- Upgrades and mods, with the reason you made them.\n- Honest troubleshooting threads when a kit refuses to cooperate.\n\n**How to post a useful build log**\n\n1. Name the kit and the version you received.\n2. Say what you ran it on (fuel, voltage, air supply, coolant) because most "it will not start" cases are a supply problem.\n3. Post the numbers, not just the outcome: compression, RPM, temperature, hours.\n4. Add photos or a short video link if you have one. A 10-second clip of a first start is worth more than a paragraph.\n\n**House rules**\n\n- Be specific and be kind. "Mine runs rough" gets guesses; "runs rough above 3,000 RPM with the needle 1.5 turns out" gets a fix.\n- No competitor spam, affiliate links or copied product descriptions.\n- Do not post personal contact details or order numbers.\n\nReplies are open to everyone, so a builder without an account can still answer. Threads that help people get an engine running get pinned.' AS body,
  'show-tell' AS category,
  'welcome,house-rules,getting-started' AS tags,
  'Kavten Team' AS author_name,
  'Kavten Team' AS author_badge,
  'published' AS status,
  1 AS is_pinned,
  1 AS is_featured,
  NOW(3) AS created_at,
  NOW(3) AS updated_at
) AS starter
WHERE NOT EXISTS (SELECT 1 FROM community_posts WHERE slug = 'welcome-to-the-kavten-builders-workshop');

INSERT INTO community_posts
  (slug, title, excerpt, body, category, tags, author_name, author_badge, status, is_pinned, is_featured, created_at, updated_at)
SELECT * FROM (SELECT
  'first-start-checklist-for-stirling-and-steam-engines' AS slug,
  'First-start checklist for Stirling and steam engines' AS title,
  'Five checks that solve most "it turns but will not run" tickets: alignment, friction, temperature delta, sealing and load.' AS excerpt,
  'Written from the support tickets we answer most often. Work through it in order; each step is cheap and each one eliminates a whole class of failure.\n\n**1. Check that it turns freely by hand**\n\nWith no heat and no pressure, the flywheel should spin for several seconds after a push. If it stops immediately, stop here: something is rubbing. Loosen the bracket screws, re-align the power piston in its bore, then re-tighten in a cross pattern.\n\n**2. Confirm the temperature difference**\n\nA Stirling engine runs on a difference, not on heat. The hot end needs a real flame contact patch and the cold end needs to stay cold. On a warm day, add a heatsink or a wet cloth to the cold cylinder and try again. If both ends feel the same after two minutes, the engine will never run.\n\n**3. Look for leaks before chasing timing**\n\nA displacement cylinder that leaks past the piston seal behaves exactly like a badly timed engine. Turn the flywheel slowly by hand with the hot end sealed: you should feel compression resistance. No resistance means the seal, the hose or the gasket is the problem.\n\n**4. Use less load than you think**\n\nA brand-new engine that spins a bare flywheel may stall the moment a pulley or a generator is attached. Break it in unloaded for 20 to 30 minutes, then add load in steps.\n\n**5. Log the numbers in your thread**\n\nAmbient temperature, hot-end temperature, fuel type, burn time, RPM. Those four numbers let another owner reproduce your result instead of guessing.\n\nIf the checklist does not fix it, open a troubleshooting thread with the numbers above and a short video. We read these threads and answer in public so the next owner finds the fix.' AS body,
  'first-start' AS category,
  'stirling,steam,first-start,troubleshooting' AS tags,
  'Kavten Team' AS author_name,
  'Kavten Team' AS author_badge,
  'published' AS status,
  1 AS is_pinned,
  1 AS is_featured,
  NOW(3) AS created_at,
  NOW(3) AS updated_at
) AS starter
WHERE NOT EXISTS (SELECT 1 FROM community_posts WHERE slug = 'first-start-checklist-for-stirling-and-steam-engines');

INSERT INTO community_posts
  (slug, title, excerpt, body, category, tags, author_name, author_badge, status, is_pinned, is_featured, created_at, updated_at)
SELECT * FROM (SELECT
  'how-to-photograph-a-build-so-people-can-actually-see-it' AS slug,
  'How to photograph a build so people can actually see it' AS title,
  'Three angles, one light source and a clean background. That is the whole trick, and it makes a build log far easier to follow.' AS excerpt,
  'A build log with dark, blurry photos gets fewer replies, not because the build is worse but because nobody can see the detail being described.\n\n**Light**\n\nUse one window and no overhead light. Side light shows machined edges, top light flattens them. If the sun is harsh, tape baking paper over the window as a diffuser.\n\n**Background**\n\nA sheet of A3 paper, a cutting mat or a plain wall. Remove the screwdriver box, the coffee cup and the tangled cable. The engine should be the only thing competing for attention.\n\n**Three angles that always work**\n\n1. A 3/4 front view at engine height, not from above.\n2. A close-up of the part you are describing, filling the frame.\n3. A scale reference, for example a ruler or a coin next to the flywheel.\n\n**Progress shots**\n\nPhotograph the same angle at each stage. Four shots taken from the same spot tell a build story better than twenty random ones.\n\n**Video**\n\nTen to thirty seconds is enough: start-up, idle, then the moment you are describing. Keep the camera still and let the sound through, because the exhaust note is diagnostic.\n\nPost the thread under Show & Tell and mention the kit and finish in the title.' AS body,
  'show-tell' AS category,
  'photography,build-log,show-and-tell' AS tags,
  'Kavten Team' AS author_name,
  'Kavten Team' AS author_badge,
  'published' AS status,
  0 AS is_pinned,
  1 AS is_featured,
  NOW(3) AS created_at,
  NOW(3) AS updated_at
) AS starter
WHERE NOT EXISTS (SELECT 1 FROM community_posts WHERE slug = 'how-to-photograph-a-build-so-people-can-actually-see-it');
