/**
 * Static manuscript loader for Digital Shadows techno-thriller
 * Loads hardcoded manuscript data for chapter reordering tool
 */

import { 
  TechnoThrillerManuscript, 
  Chapter, 
  Character, 
  Location, 
  TechConcept, 
  TimelineEvent,
  ManuscriptMetadata 
} from './manuscript-data'

/**
 * Sample manuscript data for Digital Shadows
 * Replace this with your actual manuscript content
 */
export const DIGITAL_SHADOWS_MANUSCRIPT: TechnoThrillerManuscript = {
  metadata: {
    title: 'Digital Shadows',
    author: 'Your Name',
    wordCount: 90000,
    genre: 'techno-thriller',
    version: '1.0.0',
    lastModified: new Date('2024-08-14'),
    created: new Date('2024-01-01'),
    description: 'A high-stakes techno-thriller about cyber warfare, corporate espionage, and the thin line between security and surveillance in our digital age.',
    tags: ['cybersecurity', 'hacking', 'corporate thriller', 'technology', 'surveillance']
  },

  chapters: [
    {
      id: 1,
      title: 'The Breach',
      content: `The alert came at 3:47 AM, screaming across Sarah Chen's encrypted channels with the urgency of a digital fire alarm. She bolted upright in her downtown apartment, laptop already reaching for her bedside laptop before her eyes fully adjusted to the blue glow of emergency notifications flooding her screen.

CRITICAL BREACH DETECTED
SYSTEM: NEXUS-CORE
THREAT LEVEL: CATASTROPHIC
ESTIMATED DATA COMPROMISED: 2.3TB
TIME TO CONTAINMENT: UNKNOWN

"No, no, no," she whispered, fingers flying across the keyboard as she dove into the security logs. NexusCorp's supposedly impenetrable system—the one she'd helped design, the one that protected the digital identities of forty million users—was bleeding data like a severed artery.

The attack vectors were sophisticated, almost artistic in their precision. This wasn't some script kiddie with a grudge. This was surgical, professional. Military-grade.

Sarah's breath caught as she traced the intrusion pathways. The attackers had bypassed every security protocol she'd implemented, moving through their defenses like ghosts through walls. Worse, they'd left barely a digital footprint—just enough to taunt her with their skill.

Her phone buzzed. Marcus Webb, NexusCorp's CEO, his voice tight with controlled panic: "Sarah, tell me you have good news."

"I have news," she said, still typing, eyes locked on cascading code that told a story of systematic infiltration. "Whether it's good depends on your definition."

Twenty minutes later, she was in her Tesla racing through empty city streets toward NexusCorp's downtown fortress. The building loomed against the pre-dawn sky, its glass facade reflecting the city's sleeping lights. Inside, the real battle was just beginning.

The elevator carried her to the forty-second floor, where the Security Operations Center hummed with desperate energy. Her team was already there—Jake, Maria, and Tom—their faces illuminated by walls of monitors showing the digital carnage in real-time.

"Status report," Sarah commanded, settling into her command chair.

Jake looked up from his terminal, dark circles under his eyes. "It's bad, Sarah. Really bad. They're in everything—user databases, financial records, even our government contracts. And they're still inside, copying terabytes of data."

"How long do we have?"

"At current extraction rates? Maybe six hours before they have everything."

Sarah stared at the data streams, her mind racing through possibilities and impossibilities. Six hours to save the digital lives of forty million people. Six hours to prevent the collapse of everything NexusCorp had built.

"Then we'd better get started," she said, cracking her knuckles. "Time to go hunting in the shadows."

The real war was about to begin.`,
      wordCount: 2847,
      originalPosition: 1,
      currentPosition: 1,
      
      dependencies: {
        requiredKnowledge: [],
        introduces: ['Sarah Chen', 'NexusCorp breach', 'digital security crisis'],
        references: [],
        plotThreads: ['main-breach-investigation', 'sarah-character-arc'],
        characterArcs: ['sarah-introduction']
      },
      
      metadata: {
        pov: 'Sarah Chen',
        location: 'Sarah\'s apartment, NexusCorp building',
        timeframe: '3:47 AM, Day 1',
        tensionLevel: 8,
        majorEvents: ['Initial breach discovery', 'Emergency team assembly'],
        techFocus: ['cybersecurity', 'data breach', 'intrusion detection'],
        threatLevel: 9,
        actionLevel: 6,
        plotRole: 'setup',
        actNumber: 1,
        readingTime: 12,
        complexity: 7,
        emotionalImpact: 7
      },
      
      editorState: {
        isComplete: true,
        needsReview: false,
        lastModified: new Date()
      }
    },

    {
      id: 2,
      title: 'Ghost Protocol',
      content: `Three floors above the chaos of the SOC, Marcus Webb stood in his corner office, staring out at the city skyline while his secure phone burned against his ear. The voice on the other end was ice-cold professional—the kind of voice that belonged to people who solved problems quietly, permanently.

"We warned you this might happen," the voice said. "Your security chief is talented, but she's operating with incomplete information."

Marcus gripped the phone tighter. "What kind of incomplete information?"

"The kind that could get everyone killed if she keeps digging. Call her off, Webb. Now."

"I can't just—"

"Yes, you can. You're the CEO. Executive decision. Tell her the board is handling it through 'alternative channels.' Give her something else to focus on while we clean this up."

Marcus turned away from the window, his reflection ghostlike in the glass. "And if she doesn't buy it?"

A pause. Then: "That would be... unfortunate. Dr. Chen has a brilliant mind. It would be a shame if something happened to it."

The line went dead.

Marcus set the phone down with trembling hands. Twenty years building NexusCorp from a garage startup to a tech giant, and now he was trapped between digital assassins and government shadows who spoke in polite threats.

His secure computer chimed. A message from an encrypted source, no sender ID: "The breach was not random. Your security chief is in danger. Trust no one in your organization. More information will follow. — A Friend"

Another chime. This time from Sarah: "Marcus, we're making progress. Found some strange anomalies in the attack pattern. Can we meet in your office? There's something you need to see."

Marcus stared at the two messages, his heart hammering. Sarah was brilliant, relentless, the kind of person who would never stop digging until she found the truth. But the truth, apparently, was the one thing that could get her killed.

He typed his response to Sarah: "SOC only. Board has activated external security protocols. All investigation must stay in-house."

Then he deleted both encrypted messages and poured himself three fingers of scotch, even though it wasn't yet dawn.

Outside his window, the city slept on, unaware that the digital infrastructure protecting their lives was crumbling, and that the very people sworn to protect it might be the ones orchestrating its destruction.`,
      wordCount: 1923,
      originalPosition: 2,
      currentPosition: 2,
      
      dependencies: {
        requiredKnowledge: ['NexusCorp breach', 'Sarah Chen as security chief'],
        introduces: ['Marcus Webb conspiracy', 'external threat actors', 'corporate corruption'],
        references: [
          {
            targetChapterId: 1,
            referenceType: 'setup',
            description: 'References the breach discovered in Chapter 1',
            isRequired: true
          }
        ],
        plotThreads: ['marcus-corruption-arc', 'external-conspiracy', 'main-breach-investigation'],
        characterArcs: ['marcus-moral-conflict']
      },
      
      metadata: {
        pov: 'Marcus Webb',
        location: 'NexusCorp CEO office',
        timeframe: '4:30 AM, Day 1',
        tensionLevel: 7,
        majorEvents: ['Mysterious phone call', 'Corporate conspiracy revelation'],
        techFocus: ['encrypted communications', 'corporate espionage'],
        threatLevel: 8,
        actionLevel: 4,
        plotRole: 'rising-action',
        actNumber: 1,
        readingTime: 8,
        complexity: 6,
        emotionalImpact: 6
      },
      
      editorState: {
        isComplete: true,
        needsReview: false,
        lastModified: new Date()
      }
    },

    {
      id: 3,
      title: 'Digital Archaeology',
      content: `Back in the SOC, Sarah felt the weight of Marcus's message like a punch to the gut. External security protocols? Since when did NexusCorp have external security protocols that she didn't know about?

She deleted the message and turned back to her screens, where Jake was highlighting something that made her blood run cold.

"Look at this," he said, pointing to a trace analysis. "The breach signatures—they're not trying to hide anymore. It's like they want us to see their work."

Sarah leaned closer. The attack patterns were forming a message in the raw data streams: coordinates, encoded in hexadecimal, hidden in the packet headers. "What's at these coordinates?"

Maria looked up from her terminal. "Running it now... It's an address. Warehouse district, about twenty miles north of the city."

"Could be a trap," Tom warned, his voice tight with exhaustion.

Sarah stared at the coordinates. Every instinct screamed trap, but every other instinct screamed that conventional thinking was exactly what their attackers expected. "Or it could be the only real lead we have."

Her phone buzzed. Unknown number, text message: "Trust no one at NexusCorp. The breach is an inside job. Meet at the coordinates your team just found. Come alone. Bring the intrusion logs. You have one hour. — Digital Phoenix"

Sarah's heart stopped. Digital Phoenix was a legend in the cybersecurity community—a hacker so skilled that most people thought they were a myth. Someone who supposedly could crack any system, penetrate any defense, but only targeted criminals and corrupt corporations.

If Digital Phoenix was involved, this wasn't just a breach. It was war.

"I need to step out," Sarah announced, copying the intrusion logs to an encrypted drive. "Keep monitoring, but don't try any countermeasures until I get back."

"Sarah, where are you going?" Jake called after her.

"To find out who's really attacking us," she said, grabbing her jacket and the drive. "And why."

Twenty minutes later, she was driving through industrial wasteland, following GPS coordinates to what looked like an abandoned tech graveyard. Rusted servers and dead mainframes formed geometric mountains in the early morning light. The perfect place for a clandestine meeting.

Or the perfect place to disappear forever.

Sarah parked and walked toward the center of the complex, her laptop bag slung over her shoulder, the encrypted drive in her pocket feeling heavier than lead. If this was a trap, she was walking into it with her eyes wide open.

But if it wasn't—if Digital Phoenix really had answers—then maybe she could save NexusCorp, save her forty million users, and find out why her own CEO was lying to her about external security protocols that didn't exist.

The abandoned warehouse ahead looked empty, but Sarah knew better than to trust appearances. In the digital age, nothing was ever what it seemed.

Time to learn if she was the hunter or the prey.`,
      wordCount: 2156,
      originalPosition: 3,
      currentPosition: 3,
      
      dependencies: {
        requiredKnowledge: ['NexusCorp breach', 'Sarah as security chief', 'Marcus\'s suspicious behavior'],
        introduces: ['Digital Phoenix', 'warehouse meeting location', 'inside job revelation'],
        references: [
          {
            targetChapterId: 1,
            referenceType: 'callback',
            description: 'References the SOC and security team',
            isRequired: true
          },
          {
            targetChapterId: 2,
            referenceType: 'callback',
            description: 'References Marcus\'s suspicious external protocols',
            isRequired: true
          }
        ],
        plotThreads: ['main-breach-investigation', 'digital-phoenix-mystery', 'inside-job-conspiracy'],
        characterArcs: ['sarah-investigation-deepens']
      },
      
      metadata: {
        pov: 'Sarah Chen',
        location: 'NexusCorp SOC, warehouse district',
        timeframe: '5:00 AM - 6:00 AM, Day 1',
        tensionLevel: 8,
        majorEvents: ['Digital Phoenix contact', 'Discovery of insider threat', 'Warehouse meeting setup'],
        techFocus: ['data analysis', 'encrypted communications', 'digital forensics'],
        threatLevel: 9,
        actionLevel: 7,
        plotRole: 'rising-action',
        actNumber: 1,
        readingTime: 9,
        complexity: 8,
        emotionalImpact: 8
      },
      
      editorState: {
        isComplete: true,
        needsReview: false,
        lastModified: new Date()
      }
    },

    // Add more sample chapters as needed...
    {
      id: 4,
      title: 'The Phoenix Rises',
      content: `[Chapter 4 content would go here - this is a placeholder for the actual manuscript content]`,
      wordCount: 2500,
      originalPosition: 4,
      currentPosition: 4,
      
      dependencies: {
        requiredKnowledge: ['Digital Phoenix', 'warehouse meeting'],
        introduces: ['Phoenix identity revealed', 'government conspiracy'],
        references: [
          {
            targetChapterId: 3,
            referenceType: 'payoff',
            description: 'Reveals Digital Phoenix identity',
            isRequired: true
          }
        ],
        plotThreads: ['digital-phoenix-mystery', 'government-conspiracy'],
        characterArcs: ['sarah-allies-with-phoenix']
      },
      
      metadata: {
        pov: 'Sarah Chen',
        location: 'Abandoned warehouse',
        timeframe: '6:00 AM, Day 1',
        tensionLevel: 9,
        majorEvents: ['Phoenix identity reveal', 'Alliance formation'],
        techFocus: ['advanced hacking', 'government surveillance'],
        threatLevel: 10,
        actionLevel: 8,
        plotRole: 'rising-action',
        actNumber: 1,
        readingTime: 10,
        complexity: 9,
        emotionalImpact: 9
      },
      
      editorState: {
        isComplete: false,
        needsReview: true,
        lastModified: new Date()
      }
    }
  ],

  characters: [
    {
      id: 'sarah-chen',
      name: 'Sarah Chen',
      role: 'protagonist',
      description: 'Brilliant cybersecurity expert and NexusCorp\'s Chief Security Officer. Former NSA analyst with unmatched skills in digital forensics and threat analysis.',
      
      arc: {
        introduction: 1,
        keyMoments: [
          {
            chapterId: 1,
            momentType: 'introduction',
            description: 'Discovers the massive NexusCorp breach',
            emotionalState: 'Determined but overwhelmed'
          },
          {
            chapterId: 3,
            momentType: 'development',
            description: 'Realizes the breach is an inside job and contacts Digital Phoenix',
            emotionalState: 'Suspicious and isolated'
          }
        ],
        currentStatus: 'Investigating the breach while navigating corporate conspiracy',
        goalMotivation: 'Protect user data and uncover the truth behind the attack'
      },
      
      techSkills: ['Advanced cybersecurity', 'Digital forensics', 'Intrusion detection', 'Cryptography'],
      relationships: [
        {
          targetCharacterId: 'marcus-webb',
          relationshipType: 'Boss/Employee',
          status: 'unknown',
          description: 'Growing suspicious of Marcus\'s behavior and hidden agendas'
        }
      ],
      
      appearsInChapters: [1, 3, 4],
      povChapters: [1, 3, 4]
    },
    
    {
      id: 'marcus-webb',
      name: 'Marcus Webb',
      role: 'supporting',
      description: 'CEO of NexusCorp, caught between corporate success and dangerous government entanglements. Hiding crucial information from his security team.',
      
      arc: {
        introduction: 2,
        keyMoments: [
          {
            chapterId: 2,
            momentType: 'introduction',
            description: 'Receives threatening call about the investigation',
            emotionalState: 'Fearful and conflicted'
          }
        ],
        currentStatus: 'Trying to protect Sarah while hiding dangerous secrets',
        goalMotivation: 'Protect his company and employees while managing external threats'
      },
      
      techSkills: ['Business strategy', 'Corporate management'],
      relationships: [
        {
          targetCharacterId: 'sarah-chen',
          relationshipType: 'Boss/Employee',
          status: 'neutral',
          description: 'Respects Sarah but must keep secrets from her for her own safety'
        }
      ],
      
      appearsInChapters: [2],
      povChapters: [2]
    }
  ],

  locations: [
    {
      id: 'nexuscorp-building',
      name: 'NexusCorp Headquarters',
      type: 'office',
      description: 'Forty-two story glass tower in downtown, housing the Security Operations Center and executive offices.',
      securityLevel: 'high',
      techInfrastructure: ['Quantum encryption', 'Biometric access', 'Isolated networks'],
      appearsInChapters: [1, 2],
      significanceLevel: 9
    },
    
    {
      id: 'warehouse-district',
      name: 'Abandoned Tech Warehouse',
      type: 'other',
      description: 'Industrial wasteland filled with obsolete computer equipment, perfect for clandestine meetings.',
      securityLevel: 'low',
      techInfrastructure: ['Dead electronics', 'No surveillance'],
      appearsInChapters: [3, 4],
      significanceLevel: 7
    }
  ],

  techConcepts: [
    {
      id: 'quantum-encryption',
      name: 'Quantum Encryption',
      category: 'cybersecurity',
      description: 'Advanced encryption using quantum mechanics principles, theoretically unbreakable.',
      realismLevel: 'plausible',
      introducedInChapter: 1,
      referencedInChapters: [1, 2],
      complexityLevel: 9,
      needsExplanation: true,
      explanationProvided: false,
      plotRelevance: 8,
      threatPotential: 2
    },
    
    {
      id: 'digital-forensics',
      name: 'Digital Forensics',
      category: 'cybersecurity',
      description: 'The process of investigating and analyzing digital devices and networks to uncover evidence.',
      realismLevel: 'realistic',
      introducedInChapter: 1,
      referencedInChapters: [1, 3],
      complexityLevel: 7,
      needsExplanation: true,
      explanationProvided: true,
      plotRelevance: 10,
      threatPotential: 5
    }
  ],

  timeline: [
    {
      id: 'initial-breach',
      title: 'NexusCorp Breach Detected',
      description: 'Massive data breach discovered at 3:47 AM, compromising user data and corporate secrets.',
      timestamp: '03:47 Day 1',
      chapterId: 1,
      eventType: 'attack',
      importance: 10,
      consequences: ['Data compromise', 'Corporate crisis', 'Investigation launched'],
      affectedCharacters: ['sarah-chen'],
      affectedLocations: ['nexuscorp-building']
    },
    
    {
      id: 'mysterious-call',
      title: 'Webb Receives Threatening Call',
      description: 'Marcus Webb gets a threatening call warning him to stop the investigation.',
      timestamp: '04:30 Day 1',
      chapterId: 2,
      eventType: 'revelation',
      importance: 8,
      triggeredBy: ['initial-breach'],
      consequences: ['Marcus becomes conflicted', 'Corporate conspiracy revealed'],
      affectedCharacters: ['marcus-webb'],
      affectedLocations: ['nexuscorp-building']
    },
    
    {
      id: 'phoenix-contact',
      title: 'Digital Phoenix Makes Contact',
      description: 'Legendary hacker Digital Phoenix contacts Sarah with crucial information.',
      timestamp: '05:30 Day 1',
      chapterId: 3,
      eventType: 'revelation',
      importance: 9,
      triggeredBy: ['initial-breach'],
      consequences: ['Sarah learns about inside job', 'Alliance possibility'],
      affectedCharacters: ['sarah-chen'],
      affectedLocations: ['warehouse-district']
    }
  ]
}

/**
 * Load the Digital Shadows manuscript
 */
export function loadDigitalShadowsManuscript(): Promise<TechnoThrillerManuscript> {
  return new Promise((resolve) => {
    // Simulate loading delay
    setTimeout(() => {
      resolve(DIGITAL_SHADOWS_MANUSCRIPT)
    }, 1000)
  })
}

/**
 * Load manuscript from localStorage if it exists, otherwise use default
 */
export function loadManuscriptFromStorage(): Promise<TechnoThrillerManuscript> {
  return new Promise((resolve) => {
    const stored = localStorage.getItem('digital-shadows-manuscript')
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Validate the structure
        if (parsed.metadata && parsed.chapters && Array.isArray(parsed.chapters)) {
          resolve(parsed as TechnoThrillerManuscript)
          return
        }
      } catch (error) {
        console.warn('Failed to parse stored manuscript, using default:', error)
      }
    }
    
    // Fall back to default manuscript
    resolve(DIGITAL_SHADOWS_MANUSCRIPT)
  })
}

/**
 * Save manuscript to localStorage
 */
export function saveManuscriptToStorage(manuscript: TechnoThrillerManuscript): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      localStorage.setItem('digital-shadows-manuscript', JSON.stringify(manuscript))
      resolve()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Import manuscript from file
 */
export function importManuscriptFromFile(file: File): Promise<TechnoThrillerManuscript> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const manuscript = JSON.parse(content) as TechnoThrillerManuscript
        
        // Basic validation
        if (!manuscript.metadata || !manuscript.chapters) {
          throw new Error('Invalid manuscript format')
        }
        
        resolve(manuscript)
      } catch (error) {
        reject(new Error(`Failed to parse manuscript file: ${error}`))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read manuscript file'))
    }
    
    reader.readAsText(file)
  })
}

/**
 * Export manuscript to JSON file
 */
export function exportManuscriptToFile(manuscript: TechnoThrillerManuscript, filename?: string): void {
  const json = JSON.stringify(manuscript, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `${manuscript.metadata.title.toLowerCase().replace(/\s+/g, '-')}-manuscript.json`
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Generate sample chapter content for development/testing
 */
export function generateSampleChapter(chapterId: number, title: string): Chapter {
  return {
    id: chapterId,
    title,
    content: `[Sample content for ${title} - This would contain the actual chapter text in a real implementation]`,
    wordCount: 2000 + Math.floor(Math.random() * 1000),
    originalPosition: chapterId,
    currentPosition: chapterId,
    
    dependencies: {
      requiredKnowledge: [],
      introduces: [`Chapter ${chapterId} concepts`],
      references: [],
      plotThreads: ['main-story'],
      characterArcs: ['protagonist-arc']
    },
    
    metadata: {
      pov: 'Sarah Chen',
      location: 'Various',
      timeframe: `Day ${Math.ceil(chapterId / 3)}`,
      tensionLevel: Math.floor(Math.random() * 10) + 1,
      majorEvents: [`Chapter ${chapterId} events`],
      techFocus: ['cybersecurity'],
      threatLevel: Math.floor(Math.random() * 10) + 1,
      actionLevel: Math.floor(Math.random() * 10) + 1,
      plotRole: chapterId <= 3 ? 'setup' : chapterId <= 15 ? 'rising-action' : 'climax',
      actNumber: chapterId <= 6 ? 1 : chapterId <= 18 ? 2 : 3,
      readingTime: Math.floor((2000 + Math.floor(Math.random() * 1000)) / 250),
      complexity: Math.floor(Math.random() * 10) + 1,
      emotionalImpact: Math.floor(Math.random() * 10) + 1
    },
    
    editorState: {
      isComplete: Math.random() > 0.3,
      needsReview: Math.random() > 0.7,
      lastModified: new Date()
    }
  }
}