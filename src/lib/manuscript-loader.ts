import type { 
  TechnoThrillerManuscript, 
  Chapter, 
  Character, 
  Location, 
  TechConcept 
} from '@/types/single-manuscript'

/**
 * Loads and parses your actual manuscript content
 * Replace this with your real manuscript data
 */
export async function loadDefaultManuscript(): Promise<TechnoThrillerManuscript> {
  // Sample techno-thriller manuscript structure
  const sampleChapters: Chapter[] = [
    {
      id: 'chapter-1',
      number: 1,
      title: 'The Hack',
      content: `# Chapter 1: The Hack

The screens flickered in the underground data center as Alex Morgan's fingers danced across the keyboard. Lines of code cascaded down the monitor like digital rain, each character a step deeper into the fortress of CoreTech Industries' mainframe.

"Almost there," Alex whispered, sweat beading despite the industrial air conditioning. The quantum encryption was tougher than expected, but not impossible. Never impossible.

A new window opened—access granted. Alex was in.

The corporate servers stretched out before her like a digital labyrinth. Folder after folder of classified files, each protected by layers of security that would have stopped any ordinary hacker. But Alex wasn't ordinary.

She navigated through the system with practiced ease, following the breadcrumbs she'd planted during her reconnaissance phase. Employee records, financial statements, research and development files—all of it was here, waiting to be discovered.

But something was wrong. The files she was looking for, the ones that would expose CoreTech's illegal activities, weren't where they should be. Either they'd been moved, or someone had been expecting her.

A red warning flashed across her screen: UNAUTHORIZED ACCESS DETECTED.

Alex's blood ran cold. She had seconds before they traced her location.`,
      wordCount: 185,
      originalPosition: 1,
      currentPosition: 1,
      dependencies: {
        requiredKnowledge: [],
        introduces: ['Alex Morgan', 'CoreTech Industries', 'quantum encryption', 'data center'],
        references: [],
        continuityRules: ['First introduction of protagonist', 'Establishes techno-thriller tone']
      },
      metadata: {
        pov: 'Alex Morgan',
        location: ['Underground data center'],
        timeframe: 'Present day, late night',
        tensionLevel: 7,
        majorEvents: ['Alex hacks into CoreTech Industries'],
        techElements: ['quantum encryption', 'mainframe hacking', 'data center'],
        characterArcs: ['Alex: Introduction as skilled hacker']
      }
    },
    {
      id: 'chapter-2',
      number: 2,
      title: 'Discovery',
      content: `# Chapter 2: Discovery

What Alex found in the CoreTech servers wasn't financial records or corporate secrets. It was something far worse—Project Nexus, a neural interface program that could read and manipulate human thoughts.

The files were encrypted with military-grade quantum keys, but Alex had tools for that. Each decrypted document revealed another layer of the conspiracy. CoreTech wasn't just a tech company; they were building the infrastructure for digital mind control.

Test subjects. Brain scans. Neural mapping algorithms. The evidence was overwhelming, and terrifying.

"Subject 247 shows 94% compliance rate with implanted suggestions," read one report. "Memory modification successful in 78% of cases. Recommend proceeding to Phase 3."

Alex's hands trembled as she downloaded the files. This wasn't just corporate espionage—this was crimes against humanity on a massive scale.

Her secure phone buzzed. A text from an unknown number: "Stop digging or you'll bury yourself."

Alex stared at the message, her heart pounding. Someone knew she was here. Someone was watching.

She grabbed her gear and headed for the exit, but the elevator wasn't responding. The building's security system had locked down. She was trapped.`,
      wordCount: 178,
      originalPosition: 2,
      currentPosition: 2,
      dependencies: {
        requiredKnowledge: ['Alex is a hacker', 'CoreTech Industries exists'],
        introduces: ['Project Nexus', 'neural interface technology', 'unknown threatener'],
        references: [
          {
            targetChapterId: 'chapter-1',
            referenceType: 'plot',
            description: 'Continuation of the hack discovered in Chapter 1',
            strength: 'strong'
          }
        ],
        continuityRules: ['Must follow immediately after the hack', 'Escalates the stakes']
      },
      metadata: {
        pov: 'Alex Morgan',
        location: ['Data center', 'Alex\'s location (implied)'],
        timeframe: 'Immediately after Chapter 1',
        tensionLevel: 8,
        majorEvents: ['Discovery of Project Nexus', 'First threat received'],
        techElements: ['neural interface', 'military-grade encryption', 'quantum keys'],
        characterArcs: ['Alex: Realizes the scope of the conspiracy']
      }
    },
    {
      id: 'chapter-3',
      number: 3,
      title: 'The Chase',
      content: `# Chapter 3: The Chase

Alex's apartment door exploded inward at 3 AM. Black-clad figures with tactical gear stormed in, but Alex was already gone—out the fire escape and into the neon-lit streets of downtown.

The motorcycle roared to life as gunshots echoed behind. Whoever these people were, they'd found Alex faster than should have been possible. Unless...

Alex's blood ran cold. The neural interface. If CoreTech had already deployed early prototypes, they could be tracking thoughts themselves. The only safe place now was somewhere they couldn't follow—a dead zone.

The bike screamed through empty streets, weaving between abandoned cars and construction barriers. In the distance, helicopters circled like mechanical vultures. CoreTech's reach was longer than Alex had imagined.

She needed allies. Someone who understood the technology, someone who could help expose the truth before it was too late. 

Dr. Sarah Chen. The neuroscientist who'd quit CoreTech six months ago under mysterious circumstances. If anyone knew about Project Nexus, it would be her.

Alex gunned the engine toward the university district, hoping she wasn't already too late.

Behind her, the tactical teams regrouped. The chase was just beginning.`,
      wordCount: 189,
      originalPosition: 3,
      currentPosition: 3,
      dependencies: {
        requiredKnowledge: ['Alex discovered Project Nexus', 'Alex received a threat', 'CoreTech is dangerous'],
        introduces: ['tactical team hunting Alex', 'concept of dead zones', 'motorcycle chase', 'Dr. Sarah Chen'],
        references: [
          {
            targetChapterId: 'chapter-2',
            referenceType: 'plot',
            description: 'Direct consequence of the threat received',
            strength: 'strong'
          },
          {
            targetChapterId: 'chapter-2',
            referenceType: 'tech',
            description: 'Uses neural interface concept for tracking explanation',
            strength: 'medium'
          }
        ],
        continuityRules: ['Must show immediate danger', 'Introduces escape element']
      },
      metadata: {
        pov: 'Alex Morgan',
        location: ['Alex\'s apartment', 'Downtown streets', 'University district'],
        timeframe: '3 AM, night after discovery',
        tensionLevel: 9,
        majorEvents: ['Apartment raid', 'High-speed chase begins', 'Introduction of Dr. Sarah Chen'],
        techElements: ['neural tracking', 'dead zones', 'tactical gear'],
        characterArcs: ['Alex: Becomes a fugitive, realizes the full danger']
      }
    },
    {
      id: 'chapter-4',
      number: 4,
      title: 'The Scientist',
      content: `# Chapter 4: The Scientist

Dr. Sarah Chen's laboratory was a fortress of electromagnetic shielding and white noise generators—a perfect dead zone. Alex found her working late, as expected, surrounded by brain scans and neural pathway diagrams.

"I wondered when you'd find me," Sarah said without looking up. "CoreTech's been monitoring all their former employees. You being here means you've seen the files."

"Project Nexus," Alex confirmed. "You know about it."

Sarah's laugh was bitter. "Know about it? I helped design it. Before I understood what they really intended to do with my research."

She pulled up a holographic display showing a three-dimensional brain scan. Red neural pathways pulsed like highways of thought.

"The human mind is just another network to them," Sarah explained. "They can map it, access it, and rewrite it like any other system. The test subjects weren't volunteers—they were kidnapped victims, homeless people, anyone society wouldn't miss."

Alex felt sick. "How many?"

"Thousands. And that's just Phase 2. Phase 3 involves mass deployment. Every smartphone, every smart device, every neural implant—they'll all become access points for mind control."

A proximity alarm chimed. On the security monitors, black SUVs surrounded the building.

"They found us," Sarah whispered. "Time to go."`,
      wordCount: 217,
      originalPosition: 4,
      currentPosition: 4,
      dependencies: {
        requiredKnowledge: ['Alex knows about Dr. Sarah Chen', 'Project Nexus exists', 'Alex is being hunted'],
        introduces: ['Dr. Sarah Chen character development', 'mass deployment plan', 'mind control infrastructure'],
        references: [
          {
            targetChapterId: 'chapter-3',
            referenceType: 'character',
            description: 'Follow-up on finding Dr. Chen',
            strength: 'strong'
          },
          {
            targetChapterId: 'chapter-2',
            referenceType: 'tech',
            description: 'Expands on Project Nexus details',
            strength: 'strong'
          }
        ],
        continuityRules: ['Must show Dr. Chen as knowledgeable insider', 'Reveals larger scope of threat']
      },
      metadata: {
        pov: 'Alex Morgan',
        location: ['Dr. Chen\'s laboratory', 'University building'],
        timeframe: 'Same night, later',
        tensionLevel: 8,
        majorEvents: ['Meeting with Dr. Chen', 'Revelation of mass deployment plan', 'Lab surrounded'],
        techElements: ['electromagnetic shielding', 'holographic displays', 'neural implants'],
        characterArcs: ['Alex: Gains crucial ally', 'Sarah: Reveals her past involvement']
      }
    },
    {
      id: 'chapter-5',
      number: 5,
      title: 'Underground',
      content: `# Chapter 5: Underground

The maintenance tunnels beneath the university were a maze of pipes, cables, and forgotten infrastructure. Alex and Sarah moved through the darkness, guided only by Sarah's knowledge of the building's layout.

"There's an emergency exit that leads to the subway system," Sarah whispered. "If we can reach it—"

The sound of boots echoed from behind them. CoreTech's tactical teams had found the entrance.

They ran through ankle-deep water, past humming electrical boxes and steam pipes. The air was thick with the smell of rust and decay. Above them, muffled voices coordinated the search.

"How did they find us so fast?" Alex gasped.

Sarah's face was grim in the flashlight beam. "They're not just tracking us electronically. They're using the neural interfaces. If any of their test subjects are nearby, they can see through their eyes, hear through their ears."

A human surveillance network. The implications were staggering.

They reached a junction where several tunnels converged. Sarah hesitated, consulting a mental map.

"This way," she decided, leading them down a narrower passage.

But as they rounded the corner, they found themselves face-to-face with a figure in tactical gear—one of CoreTech's operatives. But something was wrong with his eyes. They glowed with an unnatural blue light.

"Target acquired," he said in a monotone voice. "Initiating capture protocol."`,
      wordCount: 239,
      originalPosition: 5,
      currentPosition: 5,
      dependencies: {
        requiredKnowledge: ['Alex and Sarah are escaping together', 'CoreTech teams are pursuing', 'Neural interfaces exist'],
        introduces: ['human surveillance network', 'controlled operatives', 'glowing blue eyes effect'],
        references: [
          {
            targetChapterId: 'chapter-4',
            referenceType: 'plot',
            description: 'Direct continuation of the escape',
            strength: 'strong'
          },
          {
            targetChapterId: 'chapter-2',
            referenceType: 'tech',
            description: 'Practical demonstration of neural control',
            strength: 'strong'
          }
        ],
        continuityRules: ['Must show escalating danger', 'Reveals practical application of neural control']
      },
      metadata: {
        pov: 'Alex Morgan',
        location: ['University maintenance tunnels', 'Underground infrastructure'],
        timeframe: 'Continuous from Chapter 4',
        tensionLevel: 9,
        majorEvents: ['Underground chase', 'Revelation of human surveillance network', 'Encounter with controlled operative'],
        techElements: ['neural surveillance', 'controlled humans', 'glowing eye implants'],
        characterArcs: ['Alex and Sarah: Working together under extreme pressure']
      }
    }
  ]
  
  const sampleCharacters: Character[] = [
    {
      id: 'alex-morgan',
      name: 'Alex Morgan',
      role: 'protagonist',
      firstAppearance: 'chapter-1',
      description: 'Elite hacker and cybersecurity expert with a moral compass. Skilled in quantum encryption and network infiltration.',
      techExpertise: ['quantum encryption', 'network infiltration', 'cybersecurity', 'digital forensics']
    },
    {
      id: 'sarah-chen',
      name: 'Dr. Sarah Chen',
      role: 'supporting',
      firstAppearance: 'chapter-4',
      description: 'Former CoreTech neuroscientist who helped design Project Nexus before discovering its true purpose. Now fights against her former employers.',
      techExpertise: ['neuroscience', 'brain-computer interfaces', 'neural mapping', 'cognitive manipulation']
    },
    {
      id: 'unknown-threatener',
      name: 'Unknown Threatener',
      role: 'antagonist',
      firstAppearance: 'chapter-2',
      description: 'Mysterious figure working for CoreTech Industries, coordinates the hunt for Alex'
    },
    {
      id: 'controlled-operative',
      name: 'Controlled Operative',
      role: 'antagonist',
      firstAppearance: 'chapter-5',
      description: 'CoreTech tactical operative with neural implant, distinguished by glowing blue eyes'
    }
  ]
  
  const sampleLocations: Location[] = [
    {
      id: 'underground-datacenter',
      name: 'Underground Data Center',
      type: 'building',
      description: 'Secret facility beneath the city where Alex performs the hack into CoreTech',
      firstMention: 'chapter-1',
      significance: 'major'
    },
    {
      id: 'alex-apartment',
      name: 'Alex\'s Apartment',
      type: 'building',
      description: 'Alex\'s residential location, compromised and raided in Chapter 3',
      firstMention: 'chapter-3',
      significance: 'major'
    },
    {
      id: 'downtown-streets',
      name: 'Downtown Streets',
      type: 'city',
      description: 'Urban environment for high-speed chase scenes with neon lighting',
      firstMention: 'chapter-3',
      significance: 'major'
    },
    {
      id: 'sarah-laboratory',
      name: 'Dr. Chen\'s Laboratory',
      type: 'building',
      description: 'Electromagnetic shielded laboratory at the university, serves as a neural dead zone',
      firstMention: 'chapter-4',
      significance: 'major'
    },
    {
      id: 'university-tunnels',
      name: 'University Maintenance Tunnels',
      type: 'building',
      description: 'Underground tunnel system beneath the university used for escape routes',
      firstMention: 'chapter-5',
      significance: 'major'
    }
  ]
  
  const sampleTechConcepts: TechConcept[] = [
    {
      id: 'quantum-encryption',
      name: 'Quantum Encryption',
      category: 'software',
      description: 'Advanced encryption using quantum computing principles, nearly unbreakable but not impossible',
      firstIntroduction: 'chapter-1',
      complexity: 'complex',
      realismLevel: 'near-future'
    },
    {
      id: 'neural-interface',
      name: 'Neural Interface Technology',
      category: 'biotech',
      description: 'Brain-computer interface capable of reading and manipulating thoughts, core to Project Nexus',
      firstIntroduction: 'chapter-2',
      complexity: 'complex',
      realismLevel: 'speculative'
    },
    {
      id: 'dead-zones',
      name: 'Neural Dead Zones',
      category: 'other',
      description: 'Areas where neural interface technology cannot function due to electromagnetic shielding',
      firstIntroduction: 'chapter-3',
      complexity: 'moderate',
      realismLevel: 'speculative'
    },
    {
      id: 'human-surveillance',
      name: 'Human Surveillance Network',
      category: 'ai',
      description: 'Using controlled humans as surveillance devices through neural interfaces',
      firstIntroduction: 'chapter-5',
      complexity: 'complex',
      realismLevel: 'speculative'
    },
    {
      id: 'project-nexus',
      name: 'Project Nexus',
      category: 'software',
      description: 'CoreTech\'s secret program for mass mind control through neural interfaces',
      firstIntroduction: 'chapter-2',
      complexity: 'complex',
      realismLevel: 'speculative'
    }
  ]
  
  const chapterOrder = sampleChapters.map(ch => ch.id)
  
  return {
    id: 'default',
    metadata: {
      title: 'Neural Storm', // Replace with your title
      author: 'Your Name',   // Replace with your name
      genre: 'techno-thriller',
      wordCount: sampleChapters.reduce((sum, ch) => sum + ch.wordCount, 0),
      characterCount: sampleChapters.reduce((sum, ch) => sum + ch.content.length, 0),
      chapterCount: sampleChapters.length,
      lastModified: new Date(),
      created: new Date(),
      version: '1.0.0'
    },
    content: {
      chapters: sampleChapters,
      characters: sampleCharacters,
      locations: sampleLocations,
      techConcepts: sampleTechConcepts,
      timeline: [
        {
          id: 'timeline-1',
          title: 'The Hack',
          description: 'Alex successfully infiltrates CoreTech servers',
          chapterId: 'chapter-1',
          relativeTime: 'Night 1',
          significance: 'critical'
        },
        {
          id: 'timeline-2',
          title: 'Project Nexus Discovery',
          description: 'Alex uncovers the neural interface conspiracy',
          chapterId: 'chapter-2',
          relativeTime: 'Night 1, later',
          significance: 'critical'
        },
        {
          id: 'timeline-3',
          title: 'The Chase Begins',
          description: 'CoreTech raids Alex\'s apartment, chase ensues',
          chapterId: 'chapter-3',
          relativeTime: '3 AM, Night 2',
          significance: 'major'
        }
      ],
      notes: [
        {
          id: 'note-1',
          chapterId: 'chapter-2',
          content: 'Need to establish clearer timeline between hack and discovery',
          type: 'consistency',
          priority: 'medium',
          created: new Date(),
          resolved: false
        },
        {
          id: 'note-2',
          content: 'Consider adding more technical detail about neural interfaces',
          type: 'tech',
          priority: 'low',
          created: new Date(),
          resolved: false
        }
      ]
    },
    versions: new Map([
      ['original', {
        id: 'original',
        name: 'Original Order',
        description: 'Original chapter sequence',
        chapterOrder,
        created: new Date(),
        isBaseVersion: true,
        changes: []
      }]
    ]),
    currentVersionId: 'original',
    settings: {
      autoSave: true,
      autoSaveInterval: 30,
      showWordCount: true,
      showCharacterCount: true,
      enableConsistencyChecking: true,
      highlightInconsistencies: true,
      defaultView: 'editor'
    }
  }
}

/**
 * For loading your actual manuscript content
 * Replace the sample data above with your real chapters
 */
export async function loadManuscriptFromFile(filePath: string): Promise<TechnoThrillerManuscript> {
  // TODO: Implement file loading via Tauri
  // This would parse your manuscript file and convert it to the data structure
  throw new Error('File loading not yet implemented')
}

/**
 * Exports manuscript in various formats
 */
export async function exportManuscript(
  manuscript: TechnoThrillerManuscript, 
  format: 'docx' | 'pdf' | 'txt',
  versionId?: string
): Promise<void> {
  // TODO: Implement export via Tauri
  console.log(`Exporting ${manuscript.metadata.title} as ${format}`)
}