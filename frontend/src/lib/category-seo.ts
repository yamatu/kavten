// Hand-written English SEO copy per storefront category, keyed by slug.
// title excludes the "| Kavten" suffix that the layout template appends.

export type CategorySeo = {
  title: string;
  description: string;
  h1: string;
  intro: string[];
  guide: Array<[string, string]>;
  faqs: Array<{ q: string; a: string }>;
};

export const CATEGORY_SEO: Record<string, CategorySeo> = {
  'model-engines': {
    title: 'Working Model Engine Kits – Build Your Own Engine',
    description: 'Shop working model engine kits: V8, V12, inline, twin, radial and jet engine models from ENJOMOR, TOYAN, CISON, RETROL and TECHING. Gas, nitro and electric.',
    h1: 'Working Model Engine Kits',
    intro: [
      'A working model engine is a scaled-down engine with real moving internals: pistons, crankshaft, camshafts and valves that you can watch turn. Some run on gasoline or methanol and genuinely fire like a full-size engine; others are precision metal assembly kits driven by a small electric motor so you can see the mechanism in motion on your desk.',
      'This collection brings together V8 and V12 engine models, inline and V-twin engines, radial and hit-and-miss engines and turbofan models from ENJOMOR, TOYAN, CISON, RETROL, TECHING and more. Every product page lists the power source, displacement and what comes in the box so you know exactly what you are building.',
    ],
    guide: [
      ['Fuel or electric', 'Gas and nitro engines start and run on fuel and need an outdoor, ventilated space. Electric-driven kits show the same mechanism silently indoors.'],
      ['Kit or assembled', 'Assembly kits come as hundreds of metal parts with instructions; assembled engines are ready to run after setup and fuelling.'],
      ['Cylinders and size', 'Single and twin-cylinder engines are the easiest first build; V8 and V12 engines are larger centrepieces with more parts.'],
      ['Spare parts', 'Starters, clutches, exhausts and ignition upgrades for these engines are in Parts & Accessories.'],
    ],
    faqs: [
      { q: 'Do these model engines really run?', a: 'Yes. Fuel-powered engines run on gasoline or methanol just like a full-size engine. Electric-driven assembly kits use a small motor to turn the real crankshaft, pistons and valves. Each product page states which type it is.' },
      { q: 'Which model engine is best for a beginner?', a: 'A single-cylinder or twin-cylinder kit, or an electric-driven metal assembly kit, is the easiest start. Large fuel-powered V8 and V12 engines suit builders who already have experience with small engines.' },
      { q: 'What fuel do gas and nitro model engines use?', a: 'Gasoline engines use petrol mixed with two-stroke or four-stroke oil as specified by the maker, while nitro engines use model glow fuel containing methanol. Always follow the fuel ratio on the product page.' },
      { q: 'Can I buy spare parts for my model engine?', a: 'Yes. Starters, clutches, exhausts, carburettors, ignition modules and cooling parts for ENJOMOR, TOYAN, CISON and other engines are listed in Engine Parts & Upgrades.' },
    ],
  },
  'v8-engines': {
    title: 'V8 Engine Model Kits That Really Run',
    description: 'V8 engine model kits that run: ENJOMOR GS-V8 gasoline engines, TOYAN FS-V800 nitro V8s, CISON V8s and TECHING full-metal V8 assembly kits. Shipped worldwide.',
    h1: 'V8 Engine Model Kits',
    intro: [
      'Nothing sounds like a V8. This range covers fuel-powered V8 engine models that start, idle and rev like the real thing, alongside full-metal V8 assembly kits that you build piece by piece and watch turn over with an electric motor.',
      'Choose from ENJOMOR GS-V8 four-stroke gasoline engines, TOYAN FS-V800 nitro V8s, CISON V8 engines and TECHING 1:3 scale metal V8 kits with 500+ parts. Product pages list displacement, valve layout, starter options and the full packing list.',
    ],
    guide: [
      ['Running V8 or display kit', 'Gas and nitro V8s are real internal-combustion engines; TECHING-style kits are electric-driven and run indoors.'],
      ['Starting system', 'Many fuel V8s offer an electric starter kit or one-key start; check the version selector on the product page.'],
      ['Mounting', 'Stands, bases and cooling kits are sold separately for some models — see Engine Parts & Upgrades.'],
    ],
    faqs: [
      { q: 'Is the V8 engine model kit a real working engine?', a: 'Gas and nitro V8 models such as ENJOMOR GS-V8 and TOYAN FS-V800 are real working internal-combustion engines. Metal assembly kits such as TECHING V8 are driven by an electric motor and show the mechanism without burning fuel.' },
      { q: 'How long does it take to build a V8 engine kit?', a: 'A full-metal V8 assembly kit typically takes several hours to a few evenings depending on experience; the product page lists the part count and estimated assembly time where the maker provides it.' },
      { q: 'Can I put a model V8 engine in an RC car?', a: 'Some fuel V8s, including TOYAN models, are designed for RC conversions and have matching chassis, clutches and transmissions in our RC and parts categories. Check the product description for mounting compatibility.' },
    ],
  },
  'v12-v6-engines': {
    title: 'V12 & V6 Engine Models – Gas & Metal Kits',
    description: 'V12 and V6 engine models from ENJOMOR, RUIFEIYA and TECHING: gasoline DOHC V12s that run and detailed metal assembly kits for collectors.',
    h1: 'V12 & V6 Engine Models',
    intro: [
      'V12 engine models are the flagship of the model engine world: twelve cylinders, dual overhead camshafts and an unmistakable sound. This collection includes running gasoline V12s from ENJOMOR and large-scale RUIFEIYA engines, plus V6 and V12 metal assembly kits for display.',
      'These are serious builds for experienced hobbyists and collectors. Each listing details displacement, valve train, starter system and included accessories.',
    ],
    guide: [
      ['Experience level', 'V12s have the most parts and the most demanding setup — ideal after a single or twin-cylinder build.'],
      ['Space and noise', 'Fuel-powered V12s need an outdoor test area and a sturdy base.'],
      ['Starter kits', 'Look for versions bundled with a starter and base if you want a one-box setup.'],
    ],
    faqs: [
      { q: 'Do the V12 engine models run on gasoline?', a: 'The ENJOMOR GS-V12 and RUIFEIYA V12 models are gasoline-powered DOHC engines. Metal assembly kits in this category are electric-driven display models; the product page states which applies.' },
      { q: 'Are V12 model engines suitable for beginners?', a: 'They are best for builders who have already run a smaller engine. Beginners usually start with a single-cylinder, twin or electric-driven kit.' },
      { q: 'What is included with a V12 engine model?', a: 'Contents vary by version — some include a base, starter and fuel system, others the engine only. The packing list on each product page shows exactly what is in the box.' },
    ],
  },
  'inline-twin-engines': {
    title: 'Inline & V-Twin Engine Models That Run',
    description: 'Inline-four, single-cylinder and V-twin engine models from CISON, RETROL, ENJOMOR and TECHING. Working gas engines and metal kits for builders.',
    h1: 'Inline & Twin-Cylinder Engine Models',
    intro: [
      'Single-cylinder, inline and V-twin engines are the classic way into model engines: fewer parts than a V8, easy to understand and satisfying to run. The range includes CISON V-twin motorcycle-style engines, RETROL horizontal and water-cooled engines, ENJOMOR inline-four gasoline engines and TECHING metal kits.',
      'Product pages list cylinder layout, displacement, cooling type and starting method so you can compare engines side by side.',
    ],
    guide: [
      ['Air or water cooled', 'Water-cooled engines run cooler for longer sessions; air-cooled engines are simpler to set up.'],
      ['Starting', 'Choose kick-start, pull-start or electric-start versions where offered.'],
      ['Good first engine', 'A single or twin-cylinder engine is the most forgiving first running engine.'],
    ],
    faqs: [
      { q: 'What is the difference between an inline and a V-twin engine model?', a: 'An inline engine has its cylinders in a single row, while a V-twin has two cylinders set at an angle like a motorcycle engine. Both are mechanically simpler than V8 or V12 models.' },
      { q: 'Are twin-cylinder model engines good for beginners?', a: 'Yes. They have fewer parts to assemble and maintain than multi-cylinder engines while still delivering a real running-engine experience.' },
      { q: 'Do I need extra parts to run the engine?', a: 'Some engines need fuel, a starter or a stand bought separately. The packing list on each product page shows what is included.' },
    ],
  },
  'gas-nitro-engines': {
    title: 'Gas & Nitro Model Engines – Real Running Engines',
    description: 'Gasoline and nitro model engines that really run: TOYAN, ENJOMOR, RETROL, CISON and NGH four-stroke engines, radial engines and RC engines.',
    h1: 'Gas & Nitro Model Engines',
    intro: [
      'These are genuine internal-combustion model engines that burn fuel: four-stroke gasoline engines, methanol (nitro) engines, radial engines and engines built to power RC cars and boats. Brands include TOYAN, ENJOMOR, RETROL, CISON and NGH.',
      'Running a fuel engine is a hands-on hobby — you will tune the carburettor, manage cooling and hear real combustion. Each product page lists displacement, fuel type, cooling and the parts included.',
    ],
    guide: [
      ['Fuel type', 'Gasoline engines use petrol and oil; nitro engines use methanol-based glow fuel. Use only the fuel the maker specifies.'],
      ['Safety', 'Run fuel engines outdoors with ventilation, eye protection and a fire extinguisher nearby.'],
      ['RC use', 'Engines marked for RC use pair with the clutches, frames and kits in RC Vehicles and Parts.'],
    ],
    faqs: [
      { q: 'What is the difference between gas and nitro model engines?', a: 'Gas engines run on petrol mixed with oil and use spark ignition, while nitro engines run on methanol-based glow fuel and use a glow plug. Nitro engines rev higher; gas engines are usually cheaper to run.' },
      { q: 'Can I run a gas model engine indoors?', a: 'No. Fuel-burning engines produce exhaust fumes and heat and should only be run outdoors in a well-ventilated area.' },
      { q: 'Do these engines need breaking in?', a: 'Most new fuel engines benefit from a short break-in period at moderate speed. Follow the instructions supplied with the engine.' },
      { q: 'Where can I find replacement parts?', a: 'Glow plugs, spark plugs, carburettors, starters and clutches are in Engine Parts & Upgrades, organised by engine brand.' },
    ],
  },
  'jet-turbine-engines': {
    title: 'Turbofan & Jet Engine Model Kits',
    description: 'Turbofan and jet engine model kits from SKYMECH, TECHING and RETROL. Detailed metal aero engine models you build yourself and watch spin.',
    h1: 'Turbofan & Jet Engine Model Kits',
    intro: [
      'Turbofan and turbojet engine models show how a jet engine works: fan, compressor stages, combustion section and turbine, all visible as the rotor spins. Kits from SKYMECH, TECHING and RETROL are precision models you assemble yourself.',
      'Most models in this category are motor-driven display engines that do not burn fuel, which makes them safe to run on a desk or shelf. Product pages list scale, part count, power supply and lighting features.',
    ],
    guide: [
      ['Display model', 'Most kits use an electric motor to spin the fan and turbine — no fuel or flame.'],
      ['Detail level', 'Compare part counts and cut-away sections to choose between a quick build and a showpiece.'],
      ['Power', 'Check whether the model runs on batteries, USB or a mains adapter.'],
    ],
    faqs: [
      { q: 'Do turbofan engine model kits actually work?', a: 'They spin and demonstrate the airflow path of a real jet engine using an electric motor. They are educational display models rather than fuel-burning jet turbines.' },
      { q: 'How difficult is a turbofan engine kit to build?', a: 'Difficulty depends on part count. The product page lists the number of parts and the recommended age, which is a good guide to build time.' },
      { q: 'Is a jet engine model a good gift?', a: 'Yes — they are popular with aviation fans, engineers and students because they combine a build project with a clear lesson in how jet engines produce thrust.' },
    ],
  },
  'more-engine-models': {
    title: 'Hit & Miss, Radial & Mechanical Engine Models',
    description: 'Hit and miss engines, stationary engines, radial engines and mechanical models from RETROL, TECHING, TOYAN and CISON for collectors and makers.',
    h1: 'Hit & Miss, Stationary & Mechanical Models',
    intro: [
      'This collection gathers the engines and mechanisms that do not fit a single box: hit-and-miss stationary engines with their distinctive pop-whoosh rhythm, vintage stationary engines, functional workshop machine models and other mechanical kits from RETROL, TECHING, TOYAN and CISON.',
      'They make striking display pieces and are a great way to understand historical engine design. Product pages describe the power source and what you need to run each model.',
    ],
    guide: [
      ['Hit and miss engines', 'These fire only when needed to maintain speed, producing the classic irregular beat.'],
      ['Power source', 'Check whether each model runs on fuel, electricity or is a static mechanical kit.'],
      ['Display', 'Many come with a wooden or metal base ready for the shelf.'],
    ],
    faqs: [
      { q: 'What is a hit and miss engine?', a: 'A hit and miss engine is an early stationary engine design that only fires when its speed drops, so it alternates between firing (hit) and coasting (miss). Model versions recreate that rhythm.' },
      { q: 'Do hit and miss model engines need fuel?', a: 'Running versions use fuel such as gasoline; the product page states the fuel type, starting method and included accessories.' },
      { q: 'Are these models good for display?', a: 'Yes. Most are finished in brass, steel and painted metal and come with a base, making them popular collector pieces.' },
    ],
  },
  'stirling-engines': {
    title: 'Stirling Engine Kits & Hot Air Engine Models',
    description: 'Stirling engine kits and hot air engine models: single and multi-cylinder, low temperature, vacuum and Stirling-powered vehicles from ENJOMOR and RETROL.',
    h1: 'Stirling Engine Kits & Models',
    intro: [
      'A Stirling engine is an external combustion engine: it runs on the temperature difference between a hot side and a cold side, with no internal explosions and almost no noise. Light the alcohol burner — or, for low temperature models, set the engine on a cup of hot water — and the flywheel starts to turn.',
      'Our Stirling range spans classic single-cylinder engines, multi-cylinder V4 and swash-plate designs, low temperature difference (LTD) engines, flame-eater vacuum engines and Stirling-powered cars, generators and LED gadgets from ENJOMOR, RETROL and other makers.',
    ],
    guide: [
      ['Heat source', 'Most engines use an alcohol burner; LTD engines run on hot water, coffee or the warmth of your hand.'],
      ['Indoor friendly', 'Quiet operation and no exhaust fumes make Stirling engines ideal for desks and classrooms.'],
      ['Learning value', 'They clearly demonstrate thermodynamics and heat-to-motion conversion.'],
      ['Fuel', 'Use the fuel the product specifies, typically ethanol or denatured alcohol, and never leave a lit burner unattended.'],
    ],
    faqs: [
      { q: 'How does a Stirling engine work?', a: 'Gas sealed inside the engine is heated on one side and cooled on the other. As it expands and contracts it pushes a piston, which turns the flywheel. Because the heat is applied from outside, there is no combustion inside the engine.' },
      { q: 'What fuel does a Stirling engine use?', a: 'Most models use an alcohol burner with ethanol or denatured alcohol. Low temperature Stirling engines need no fuel at all — a cup of hot water is enough.' },
      { q: 'Are Stirling engines safe for kids?', a: 'They are a popular STEM gift, but models with an alcohol burner involve an open flame and should be used with adult supervision. Low temperature models are the safest option.' },
      { q: 'Why won’t my Stirling engine start?', a: 'Give the hot side a minute or two to heat up, then flick the flywheel to start it. Make sure the burner is filled and centred, and that nothing is rubbing against the flywheel.' },
    ],
  },
  'single-cylinder-stirling': {
    title: 'Single Cylinder Stirling Engine Kits',
    description: 'Single cylinder Stirling engine kits and models from ENJOMOR, RETROL and Microcosm. Alcohol-fired hot air engines — a perfect first Stirling engine.',
    h1: 'Single Cylinder Stirling Engines',
    intro: [
      'The single cylinder Stirling engine is the classic hot air engine: one displacer, one power piston and a flywheel that spins as soon as the hot end warms up. It is the clearest demonstration of how heat becomes motion and the easiest Stirling engine to own.',
      'Choose from ENJOMOR, RETROL and Microcosm models, from compact desk engines to steampunk airships and aircraft-style designs.',
    ],
    guide: [
      ['Best first Stirling', 'Simple, reliable and quick to start.'],
      ['Burner', 'Most include an alcohol burner; fill with ethanol or denatured alcohol.'],
    ],
    faqs: [
      { q: 'Is a single cylinder Stirling engine good for beginners?', a: 'Yes. It has the fewest moving parts, starts easily and is the most common choice for a first Stirling engine.' },
      { q: 'How long does a Stirling engine run?', a: 'It runs for as long as the heat source lasts — typically the burn time of one burner fill.' },
      { q: 'Does it come assembled?', a: 'Most single cylinder models arrive assembled or nearly assembled. Kit versions are marked as DIY on the product page.' },
    ],
  },
  'multi-cylinder-stirling': {
    title: 'Multi-Cylinder Stirling Engines – V4 & 16 Cylinder',
    description: 'Multi-cylinder Stirling engines from ENJOMOR: twin, V4, four-cylinder and 16-cylinder swash plate hot air engines with smooth, powerful running.',
    h1: 'Multi-Cylinder Stirling Engines',
    intro: [
      'Multi-cylinder Stirling engines use several hot air cylinders working together for smoother running and more power. The range includes twin and four-cylinder layouts, V4 engines and dramatic 16-cylinder swash plate engines from ENJOMOR.',
      'These are impressive showpieces that still run silently on an alcohol burner.',
    ],
    guide: [
      ['Smoothness', 'More cylinders give steadier rotation and more torque.'],
      ['Showpiece', 'Swash plate and V-layout engines are among the most eye-catching Stirling models.'],
    ],
    faqs: [
      { q: 'Why choose a multi-cylinder Stirling engine?', a: 'More cylinders deliver smoother rotation and more power, and the mechanism is more intricate to watch than a single-cylinder engine.' },
      { q: 'Are multi-cylinder Stirling engines harder to start?', a: 'They need a little longer to heat up, but they start the same way: light the burner, wait for the hot end to warm and flick the flywheel.' },
      { q: 'What is a swash plate Stirling engine?', a: 'A swash plate engine arranges its cylinders around a central shaft and converts their motion through an angled plate, allowing compact layouts with many cylinders.' },
    ],
  },
  'low-temperature-stirling': {
    title: 'Low Temperature Stirling Engines – Coffee Cup',
    description: 'LTD Stirling engines that run on a cup of hot water, coffee or the warmth of your hand. No flame, no fuel — safe desk toys and STEM gifts.',
    h1: 'Low Temperature Stirling Engines',
    intro: [
      'Low temperature difference (LTD) Stirling engines run on a very small temperature gap. Place one on a mug of hot coffee or warm water — or sometimes just in the palm of your hand — and the flywheel begins to turn.',
      'With no flame and no fuel, they are the safest Stirling engines and a favourite desk toy and classroom demonstration.',
    ],
    guide: [
      ['No fuel', 'Runs on hot water, coffee, ice or body heat.'],
      ['Works both ways', 'Many LTD engines also run on ice, turning in the opposite direction.'],
    ],
    faqs: [
      { q: 'Can a Stirling engine run on a cup of coffee?', a: 'Yes. Low temperature difference Stirling engines are designed to run on the heat from a cup of hot coffee or water.' },
      { q: 'Will it run on the heat of my hand?', a: 'The most sensitive LTD models can run on hand heat in a cool room; product pages state the minimum temperature difference when the maker provides it.' },
      { q: 'Are low temperature Stirling engines safe for children?', a: 'They involve no flame or fuel, making them the safest Stirling engines. Take care with hot water around younger children.' },
    ],
  },
  'stirling-vehicles': {
    title: 'Stirling Engine Cars, Generators & Gadgets',
    description: 'Stirling-powered cars, tractors, generators, fans and LED gadgets from ENJOMOR, TECHING and RETROL. Hot air engines that drive something you can see.',
    h1: 'Stirling Vehicles, Generators & Gadgets',
    intro: [
      'Here the Stirling engine gets a job: driving a car or tractor, spinning a generator to light LEDs, turning a fan or pumping water. These models make the energy conversion visible from heat, to motion, to electricity.',
      'Models come from ENJOMOR, TECHING and RETROL, including vintage car kits and water-pumping engines.',
    ],
    guide: [
      ['Generator models', 'Show heat converted into electricity that lights an LED.'],
      ['Moving vehicles', 'Need a smooth, flat surface to run.'],
    ],
    faqs: [
      { q: 'Can a Stirling engine generate electricity?', a: 'Yes. Generator models connect the engine to a small dynamo that lights LEDs, demonstrating heat-to-electricity conversion.' },
      { q: 'Do Stirling engine cars actually drive?', a: 'Vehicle models are driven by their Stirling engine and move slowly across a flat surface once the engine is warm.' },
      { q: 'What fuel do these models use?', a: 'Most use an alcohol burner; the product page lists the heat source and burn time.' },
    ],
  },
  'vacuum-engines': {
    title: 'Vacuum Engines & Flame Eater Engine Models',
    description: 'Flame eater vacuum engine models from RETROL: engines that suck in a flame to run. Horizontal, crossbeam and tractor designs for curious makers.',
    h1: 'Vacuum & Flame Eater Engines',
    intro: [
      'A vacuum engine — also called a flame eater or flame licker — draws a flame into its cylinder, then cools the hot gas so it contracts and pulls the piston back. Watching the flame flicker in and out with every stroke is mesmerising.',
      'This collection features RETROL crossbeam engines, horizontal opposed twins and flame-eater tractor models.',
    ],
    guide: [
      ['Visible operation', 'You can see the flame being drawn in on each cycle.'],
      ['Burner', 'Uses an alcohol burner; supervise the open flame at all times.'],
    ],
    faqs: [
      { q: 'How does a flame eater engine work?', a: 'A valve opens to let the flame heat the gas in the cylinder, then closes. As the trapped gas cools it contracts, creating a partial vacuum that pulls the piston and turns the flywheel.' },
      { q: 'Is a vacuum engine a type of Stirling engine?', a: 'It is a related hot air engine. Unlike a Stirling engine, it takes the flame directly into the cylinder.' },
      { q: 'What fuel does it need?', a: 'An alcohol burner with ethanol or denatured alcohol, as specified on the product page.' },
    ],
  },
  'steam-engines': {
    title: 'Model Steam Engines & Live Steam Kits',
    description: 'Live steam model engines and boilers from KACIO, RETROL and ENJOMOR: stationary engines, oscillating engines, steam turbines and kits with boilers.',
    h1: 'Model Steam Engines & Live Steam Kits',
    intro: [
      'Live steam engines run on real steam: a boiler heats water, and the pressure drives pistons or a turbine. From single-cylinder oscillating engines to multi-cylinder V4 engines, horizontal boilers and steam turbine generators, this collection covers the classic hobby of steam.',
      'Brands include KACIO, RETROL, ENJOMOR and Microcosm. Product pages detail boiler capacity, heat source, cylinder layout and what is included, so you can build a complete steam plant or add an engine to an existing boiler.',
    ],
    guide: [
      ['Engine or full set', 'Some listings are engines only and need a separate boiler; others are complete sets with boiler and burner.'],
      ['Heat source', 'Boilers are heated by gas burners, alcohol burners or solid fuel depending on the model.'],
      ['Water', 'Use distilled water to prevent scale inside the boiler.'],
      ['Safety', 'Boilers operate under pressure and get hot; only use models with a working safety valve and supervise at all times.'],
    ],
    faqs: [
      { q: 'How does a model steam engine work?', a: 'Water in the boiler is heated until it turns to steam. The steam pressure pushes the piston (or spins a turbine), turning the flywheel, and the spent steam is exhausted.' },
      { q: 'Do I need a boiler for a steam engine?', a: 'Yes, a steam engine needs a steam source. Some products include a boiler and burner; engine-only listings need a compatible boiler such as the KACIO horizontal boilers.' },
      { q: 'What water should I use in a model steam boiler?', a: 'Use distilled water. Tap water leaves mineral deposits that reduce efficiency and can block valves.' },
      { q: 'Are model steam engines safe?', a: 'They are safe when used as directed: keep the safety valve functional, never run the boiler dry and supervise the engine while it is hot.' },
    ],
  },
  'rc-vehicles': {
    title: 'Nitro RC Cars, RC Helicopters, Tanks & Boats',
    description: 'RC vehicles for enthusiasts: nitro and gas RC cars and crawlers, scale RC helicopters, RC planes, 1/16 RC tanks and RC boats from VRX, HSP, FLISHRC and more.',
    h1: 'RC Vehicles',
    intro: [
      'Our RC range is built around enthusiasts who want more than a toy: nitro and gasoline RC cars and crawlers with real engines, scale RC helicopters from FLISHRC, YU XIANG, FLYWING and ROBAN, fixed-wing RC planes, 1/16 scale RC tanks and RC boats.',
      'Many models are available as ready-to-run (RTR) or as kits and chassis for your own engine. Product pages list scale, channels, power system, battery and what is in the box.',
    ],
    guide: [
      ['RTR or kit', 'RTR models include radio and electronics; kits and rollers let you choose your own engine and electronics.'],
      ['Power', 'Choose nitro or gas for real engine sound, or electric for quieter running.'],
      ['Scale', 'Scale (1/10, 1/16) and helicopter class (450, 500, 700) indicate size.'],
    ],
    faqs: [
      { q: 'What does RTR mean for RC cars?', a: 'RTR means ready-to-run: the vehicle comes assembled with its transmitter and electronics. You may still need fuel or batteries as listed on the product page.' },
      { q: 'Are nitro RC cars hard to maintain?', a: 'Nitro cars need fuel, occasional engine tuning and cleaning after runs. They reward that effort with real engine sound and speed.' },
      { q: 'Which RC helicopter class should I choose?', a: 'Smaller 450-class helicopters are more affordable and easier to transport; 500 and 700-class scale helicopters are larger, more stable and more detailed.' },
      { q: 'Do you sell RC spare parts?', a: 'Yes. Transmitters, controllers, chassis parts and electronics are in RC Parts & Electronics.' },
    ],
  },
  'rc-cars-trucks': {
    title: 'Nitro & Gas RC Cars, Crawlers and RC Trucks',
    description: 'Nitro and gasoline RC cars, 4WD crawlers and RC trucks from VRX, HSP, TOYAN and HUINA, including engine-powered RC kits and RTR models.',
    h1: 'RC Cars, Crawlers & Trucks',
    intro: [
      'From 1/10 scale nitro crawlers powered by TOYAN and SEMTO engines to VRX and HSP off-road cars, HUINA construction trucks and military RC trucks, this collection is for drivers who want real performance and realism.',
      'Look for RTR versions if you want to drive straight away, or chassis-only versions to install your own engine.',
    ],
    guide: [
      ['Engine-powered crawlers', 'Real internal-combustion engines in a 4WD crawler chassis.'],
      ['Chassis only', 'Pair with an engine from Gas & Nitro Model Engines.'],
    ],
    faqs: [
      { q: 'Can I install a model engine in an RC car?', a: 'Yes. Several chassis are designed for TOYAN and SEMTO engines and are sold as chassis-only or complete RTR versions.' },
      { q: 'What scale RC car should I buy?', a: '1/10 scale is the most popular size for off-road cars and crawlers, with wide parts availability. 1/16 and 1/18 models are smaller and easier to run in limited space.' },
      { q: 'Do nitro RC cars need special fuel?', a: 'Yes, nitro RC cars use methanol-based glow fuel. Gas-powered models use petrol mixed with oil.' },
    ],
  },
  'rc-helicopters': {
    title: 'Scale RC Helicopters – 450, 500 & 700 Class',
    description: 'Scale RC helicopters from FLISHRC, YU XIANG, FLYWING, WOLFBUSH and ROBAN: 450 to 700-class flybarless and GPS models with realistic fuselages.',
    h1: 'Scale RC Helicopters',
    intro: [
      'Scale RC helicopters reproduce real aircraft such as the AH-1 Cobra, HH-60 Jayhawk and CH-53E Super Stallion with detailed fuselages and modern flight controllers. Brands include FLISHRC, YU XIANG, FLYWING, WOLFBUSH and ROBAN.',
      'Many models feature GPS position hold, flybarless control and 6-channel radios, making large scale helicopters far easier to fly than in the past.',
    ],
    guide: [
      ['Size class', '450-class is compact; 500 and 700-class models are larger and more stable outdoors.'],
      ['Flight assist', 'GPS and stabilised flight modes help pilots stepping up to scale helicopters.'],
    ],
    faqs: [
      { q: 'Are GPS RC helicopters easier to fly?', a: 'Yes. GPS position hold and stabilised modes keep the helicopter steady, which helps pilots who are new to larger scale models.' },
      { q: 'What does flybarless mean?', a: 'A flybarless helicopter uses an electronic flight controller instead of a mechanical flybar to stabilise the rotor, giving sharper and more efficient control.' },
      { q: 'Do RC helicopters include a transmitter?', a: 'RTF versions include a transmitter; other versions may not. The product page lists the version contents.' },
    ],
  },
  'rc-airplanes': {
    title: 'RC Airplanes & 3D Flight Models',
    description: 'RC airplanes and 3D flight models from YU XIANG, XK and FLYWING: 2.4G brushless and direct-drive models for sport and aerobatic flying.',
    h1: 'RC Airplanes & 3D Flight Models',
    intro: [
      'This collection covers radio-controlled aircraft for sport and 3D aerobatic flying from YU XIANG, XK and FLYWING, including brushless direct-drive models with 6-axis stabilisation.',
      'Product pages list the channel count, motor type, stabilisation modes and what is in the box.',
    ],
    guide: [
      ['Stabilisation', '6-axis gyro modes make learning and recovery easier.'],
      ['Brushless power', 'Brushless motors deliver more power and longer life.'],
    ],
    faqs: [
      { q: 'Are these RC aircraft suitable for beginners?', a: 'Models with stabilised flight modes are the most beginner-friendly. Aerobatic 3D models suit pilots with some experience.' },
      { q: 'What does 2.4G mean on an RC aircraft?', a: 'It refers to the 2.4 GHz radio band, which gives reliable control with low interference.' },
      { q: 'Do I need a separate transmitter?', a: 'It depends on the version; RTF packages include a transmitter while some versions are bind-and-fly. Check the version options.' },
    ],
  },
  'rc-tanks': {
    title: '1/16 Scale RC Tanks with Infrared Battle',
    description: '1/16 scale RC tanks: Leopard 2A7, Merkava IV, T-34 and more with 2.4G control, infrared battle systems, sound and smoke effects.',
    h1: '1/16 Scale RC Tanks',
    intro: [
      'Our 1/16 scale RC tanks recreate famous armour including the German Leopard 2A7, Israeli Merkava IV and Soviet T-34. They feature 2.4 GHz control, rotating turrets and, on many models, infrared battle systems, sound and smoke effects.',
      'Infrared combat lets two tanks battle each other and register hits — a great way to share the hobby.',
    ],
    guide: [
      ['Infrared battle', 'Tanks with IR systems can fight each other and record hits.'],
      ['Effects', 'Check for sound, smoke and recoil features on the product page.'],
    ],
    faqs: [
      { q: 'Can two RC tanks battle each other?', a: 'Yes, tanks with infrared battle systems can fire IR signals at each other and register hits.' },
      { q: 'What scale are these RC tanks?', a: 'Most are 1/16 scale, a popular size with detailed bodies and good off-road ability.' },
      { q: 'Are RC tanks good for kids?', a: 'They are suitable for older children and adults; check the recommended age on each product page.' },
    ],
  },
  'rc-boats': {
    title: 'RC Boats, RC Bait Boats & Model Warships',
    description: 'RC boats including GPS bait boats for fishing and electric model warships, with 2.4G control and long-range operation.',
    h1: 'RC Boats & Bait Boats',
    intro: [
      'Our RC boat range includes GPS bait boats for anglers — carrying bait and lines out to your swim — and electric model warships for display and pond running.',
      'Product pages list range, battery capacity, hopper capacity and GPS features.',
    ],
    guide: [
      ['Bait boats', 'GPS return and multiple hoppers help place bait precisely.'],
      ['Battery', 'Larger batteries give longer running time and range.'],
    ],
    faqs: [
      { q: 'What is an RC bait boat?', a: 'An RC bait boat carries bait and fishing line out on the water and drops it at a chosen spot, helping anglers reach distant swims.' },
      { q: 'How far can an RC bait boat travel?', a: 'Range depends on the model; each product page lists the rated control range and battery capacity.' },
      { q: 'Can RC boats be used in salt water?', a: 'Rinse any boat with fresh water after use; check the product description for the maker’s guidance on salt water.' },
    ],
  },
  '3d-metal-model-kits': {
    title: '3D Metal Puzzles & Mechanical Model Kits for Adults',
    description: '3D metal puzzles and mechanical model kits for adults: steampunk animals, kinetic sculptures, orreries and engines from Punkbuild, TECHING and more.',
    h1: '3D Metal Puzzles & Mechanical Model Kits',
    intro: [
      '3D metal model kits turn hundreds of precision-cut stainless steel, brass and alloy parts into kinetic sculptures: steampunk whales and turtles, mechanical horses, orreries, vehicles and more. Many have moving joints or gears that animate the finished model.',
      'They are relaxing, absorbing builds for adults and teens and make outstanding gifts. Product pages list the part count, materials, finished size and estimated build time.',
    ],
    guide: [
      ['Part count', 'Higher part counts mean longer, more detailed builds.'],
      ['Moving parts', 'Look for kinetic or gear-driven models if you want the finished piece to move.'],
      ['Tools', 'Most kits include tools; tweezers and small pliers make assembly easier.'],
    ],
    faqs: [
      { q: 'Are 3D metal puzzles hard to build?', a: 'Difficulty scales with part count. Kits with a few hundred parts suit a first build, while 1,000+ part models are long projects for experienced builders.' },
      { q: 'Do 3D metal model kits need glue or soldering?', a: 'Most are bolt-together or slot-and-tab designs that need no glue or soldering. Check the product description for the assembly method.' },
      { q: 'Who are metal model kits for?', a: 'They are designed for adults and teens who enjoy detailed hands-on projects; check the recommended age on each product page.' },
    ],
  },
  'science-stem-kits': {
    title: 'Tesla Coils, Science Kits & STEM Models',
    description: 'Musical Tesla coils, plasma toys, physics experiment kits, robot kits, desktop CNC machines and astronomy gear for curious minds and classrooms.',
    h1: 'Science Kits, Tesla Coils & STEM Models',
    intro: [
      'Hands-on science makes ideas stick. This category gathers musical Tesla coils that play songs through plasma arcs, physics experiment models, programmable robot kits, desktop CNC machines and astronomy equipment.',
      'They suit classrooms, makers and anyone who learns best by building and experimenting. Product pages list power requirements, age guidance and safety notes.',
    ],
    guide: [
      ['High voltage', 'Tesla coils produce high voltage; keep them away from electronics and follow safety guidance.'],
      ['Age guidance', 'Check the recommended age, especially for kits with mains power or small parts.'],
    ],
    faqs: [
      { q: 'What is a musical Tesla coil?', a: 'A musical Tesla coil modulates its plasma arc to produce sound, so it can play music from a phone or audio input through the sparks themselves.' },
      { q: 'Are Tesla coils safe?', a: 'Hobby Tesla coils are designed for demonstration, but they produce high voltage and electromagnetic interference. Keep them away from electronics and pacemakers and never touch the arc.' },
      { q: 'Are these kits suitable for school projects?', a: 'Many are popular for STEM learning. Check each product’s age guidance and use adult supervision where indicated.' },
    ],
  },
  'tesla-coils': {
    title: 'Musical Tesla Coils & Plasma Arc Kits',
    description: 'Musical Tesla coils and plasma arc speakers that play music through sparks, plus plasma globes and arc lighters. High-voltage physics you can hear.',
    h1: 'Musical Tesla Coils',
    intro: [
      'A musical Tesla coil turns a high-voltage plasma arc into a loudspeaker — connect a phone and the sparks play your song. It is one of the most memorable physics demonstrations you can own.',
      'Product pages list input options, power supply and safety guidance.',
    ],
    guide: [
      ['Audio input', 'Most connect by Bluetooth or audio cable to play music.'],
      ['Safety', 'Keep away from electronics and never touch the arc.'],
    ],
    faqs: [
      { q: 'How does a musical Tesla coil play music?', a: 'It modulates the plasma arc at audio frequencies, so the arc itself vibrates the air and produces sound.' },
      { q: 'Can a Tesla coil damage my phone?', a: 'Keep phones and other electronics at a safe distance; use the supplied cable or Bluetooth connection as described on the product page.' },
      { q: 'Do Tesla coils produce ozone?', a: 'Plasma arcs produce small amounts of ozone, so use them in a ventilated room for short sessions.' },
    ],
  },
  'science-experiments': {
    title: 'Physics Experiment Kits, Robot Kits & Mini CNC',
    description: 'Physics experiment models, programmable robot kits, desktop mini CNC machines and STEM learning models from TECHING, Punkbuild and more.',
    h1: 'Science Experiments & STEM Models',
    intro: [
      'From magnetic levitation and energy-conversion experiments to programmable robot cars and desktop CNC milling machines, these models help students and makers explore physics and engineering by building.',
      'Product pages describe what each kit teaches, its power requirements and the recommended age.',
    ],
    guide: [
      ['Learning goal', 'Choose by topic: energy, magnetism, mechanics or programming.'],
      ['Workshop machines', 'Mini CNC machines need a computer and suitable software.'],
    ],
    faqs: [
      { q: 'Are these STEM kits suitable for classrooms?', a: 'Many are popular for classroom demonstrations; check the age guidance and supervision notes on each product page.' },
      { q: 'Do the robot kits require programming?', a: 'Programmable robot kits can be coded, and some also offer app control. Product pages list the supported software.' },
      { q: 'What can a desktop mini CNC machine cut?', a: 'Desktop CNC machines are typically used for wood, plastics and soft metals; see each product page for supported materials.' },
    ],
  },
  'astronomy-gear': {
    title: 'Astrophotography Mounts & Telescopes',
    description: 'Astrophotography gear: harmonic equatorial mounts, Newtonian telescopes and WandererAstro accessories for deep-sky imaging.',
    h1: 'Astronomy & Astrophotography Gear',
    intro: [
      'For hobbyists who build and tinker beyond engines, this collection includes harmonic equatorial mounts, fast Newtonian telescopes and WandererAstro astrophotography accessories for deep-sky imaging.',
      'Product pages list payload capacity, focal length and compatibility.',
    ],
    guide: [
      ['Mount payload', 'Choose a mount rated comfortably above your telescope and camera weight.'],
      ['Focal ratio', 'Fast telescopes (low f-number) collect light quickly for deep-sky imaging.'],
    ],
    faqs: [
      { q: 'What is a harmonic equatorial mount?', a: 'A harmonic (strain wave) mount uses harmonic drive gearing for a high payload in a compact, lightweight body, popular for portable astrophotography.' },
      { q: 'What telescope is good for deep-sky astrophotography?', a: 'Fast Newtonian telescopes with a low focal ratio gather light quickly, making them well suited to galaxies and nebulae.' },
      { q: 'Are these items compatible with my camera?', a: 'Compatibility depends on the adapter and connection; check the specifications on each product page.' },
    ],
  },
  'parts-accessories': {
    title: 'Model Engine Parts & RC Spare Parts',
    description: 'Spare parts and upgrades for model engines and RC: starters, clutches, exhausts, ignition for CISON, TOYAN, ENJOMOR, SEMTO, plus Stirling, steam and RC parts.',
    h1: 'Model Engine Parts & Accessories',
    intro: [
      'Keep your engines running and make them better. This collection holds spare parts and upgrades for the engines and RC models we sell: starter kits, clutches, exhausts, carburettors, ignition modules, cooling systems, stands and bases for CISON, TOYAN, ENJOMOR, SEMTO and RETROL engines.',
      'There are also burners, gas tanks and boiler parts for Stirling and steam engines, plus RC transmitters, controllers and electronics. Product titles name the engine model each part fits.',
    ],
    guide: [
      ['Check compatibility', 'Match the engine model named in the product title, for example TOYAN FS-V800 or CISON L4-175.'],
      ['Upgrades', 'Electric starters, Bluetooth controllers and cooling kits improve everyday running.'],
      ['Consumables', 'Spark plugs, glow plugs and filters are worth keeping in stock.'],
    ],
    faqs: [
      { q: 'How do I know a part fits my engine?', a: 'Each part title names the engine model it is made for, such as TOYAN FS-S100 or CISON L4-175. If you are unsure, contact us with your engine model before ordering.' },
      { q: 'Do you sell parts for engines bought elsewhere?', a: 'Yes, as long as the part is listed for your engine model; the fit depends on the engine, not where it was bought.' },
      { q: 'Do you stock Stirling and steam engine parts?', a: 'Yes. Burners, gas tanks, condensate pots and other parts are in Stirling & Steam Parts.' },
    ],
  },
  'engine-parts': {
    title: 'Model Engine Parts – TOYAN, CISON, ENJOMOR, SEMTO',
    description: 'Starters, clutches, exhausts, carburettors, ignition, cooling kits and stands for TOYAN, CISON, ENJOMOR and SEMTO model engines.',
    h1: 'Model Engine Parts & Upgrades',
    intro: [
      'Spare and upgrade parts for running model engines: electric starter kits, centrifugal clutches, exhaust silencers, carburettors, CDI and MCU ignition modules, water cooling kits, gearboxes and display stands for TOYAN, CISON, ENJOMOR and SEMTO engines.',
      'Every product title names the engine model it fits so you can find the right part quickly.',
    ],
    guide: [
      ['Fitment', 'Match the engine model in the title, e.g. TOYAN FS-L200 or CISON LS-52.'],
      ['Starters and clutches', 'The most popular upgrades for engines used in RC builds.'],
    ],
    faqs: [
      { q: 'Which parts are compatible with my TOYAN engine?', a: 'Search for your engine model, for example FS-S100 or FS-V800; compatible parts include the model in their title.' },
      { q: 'Do I need a clutch to use a model engine in an RC car?', a: 'Yes, a centrifugal clutch lets the engine idle without driving the wheels. Clutches are listed per engine model.' },
      { q: 'Can I upgrade my engine to an electric starter?', a: 'Many engines have electric starter kits available; look for starter kits that name your engine model.' },
    ],
  },
  'stirling-steam-parts': {
    title: 'Stirling & Steam Engine Parts – Burners, Boilers',
    description: 'Parts for Stirling and steam engines: alcohol burners, gas tanks, condensate pots, valves and boiler accessories for KACIO, RETROL and ENJOMOR.',
    h1: 'Stirling & Steam Engine Parts',
    intro: [
      'Spare parts and accessories for hot air and steam engines: alcohol burners, gas tanks, condensate pots, valves, gauges and boiler accessories for KACIO, RETROL and ENJOMOR models.',
      'Product titles name the boiler or engine each part is designed for.',
    ],
    guide: [
      ['Boiler parts', 'Match the KACIO or RETROL boiler model in the title.'],
      ['Burners', 'Replacement burners keep Stirling engines running at full heat.'],
    ],
    faqs: [
      { q: 'Do you sell replacement burners for Stirling engines?', a: 'Yes, alcohol burners and related parts are listed here; check the product title for the matching engine.' },
      { q: 'Which parts fit the KACIO WS100 boilers?', a: 'Gas tanks and condensate pots made for the WS100L and WS100XL boilers name those models in their titles.' },
      { q: 'Can I upgrade my steam engine setup?', a: 'Yes — accessories such as larger gas tanks and condensate pots extend running time and keep your layout tidy.' },
    ],
  },
  'rc-parts': {
    title: 'RC Parts, Transmitters & Flight Sim Controllers',
    description: 'RC spare parts and electronics: transmitters, flight simulator controllers, servos, chassis parts and engine RC kits from HSP, TOYAN, FLYWING and WOLFBUSH.',
    h1: 'RC Parts & Electronics',
    intro: [
      'Parts and electronics for RC cars, helicopters and planes: transmitters, flight simulator controllers, servos, chassis and drivetrain parts and engine conversion sets from HSP, TOYAN, FLYWING and WOLFBUSH.',
      'Product pages list the protocol, channel count and compatible models.',
    ],
    guide: [
      ['Radio protocol', 'Check compatibility (for example ELRS or EdgeTX) with your receiver.'],
      ['Simulators', 'Flight simulator controllers let you practise before flying a real model.'],
    ],
    faqs: [
      { q: 'Will this transmitter work with my RC model?', a: 'It depends on the radio protocol of your receiver; product pages list the supported protocols.' },
      { q: 'Why use an RC flight simulator controller?', a: 'Simulators let you practise helicopter and plane flying on a computer without risking a crash.' },
      { q: 'Do you sell engine conversion kits for RC cars?', a: 'Yes, engine-powered RC sets for TOYAN engines are listed here and in RC Cars & Trucks.' },
    ],
  },
};

export function getCategorySeo(slug?: string | null): CategorySeo | undefined {
  return slug ? CATEGORY_SEO[slug] : undefined;
}
