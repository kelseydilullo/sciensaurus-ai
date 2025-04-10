// Script to generate an article summary using OpenAI API
// This uses the same prompt as the Sciensaurus application
require('dotenv').config({ path: '.env.local' });  // Changed to load from .env.local
const fs = require('fs');
const { OpenAI } = require('openai');

// Initialize OpenAI with API key from .env.local file
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Article URL from PubMed Central
const articleUrl = "https://pmc.ncbi.nlm.nih.gov/articles/PMC11128959/";
const articleTitle = "Comparison of local massage, steroid injection, and extracorporeal shock wave therapy efficacy in the treatment of lateral epicondylitis";
const articleContent = `
Jt Dis Relat Surg. 2024 Apr 26;35(2):386–395. doi: 10.52312/jdrs.2024.1648

Comparison of local massage, steroid injection, and extracorporeal shock wave therapy efficacy in the treatment of lateral epicondylitis

Baki Volkan Çetin, Ömercan Sepetçi, İzzettin Yazar, Ahmet Yiğit Kaptan, Özlem Orhan, Mehmet Demir, Mehmet Akif Altay

Abstract:

Objectives: This study aimed to compare the clinical outcomes of patients with lateral epicondylitis (LE) treated with local massage, corticosteroid (CS) injection, and extracorporeal shock wave therapy (ESWT).

Patients and methods: This randomized prospective study included 52 patients. Patients treated with local massage in Group 1 (n=17; 9 males, 8 females; mean age: 46.1±10.9 years; range, 27 to 64 years), CS injection in Group 2 (n=17; 7 males, 10 females; mean age: 46.0±8.8 years; range, 28 to 63 years), and ESWT in Group 3 (n=18; 12 males, 6 females; mean age: 46.7±11.3 years; range, 28 to 68 years) for LE were evaluated between March 2021 and June 2022. Clinical outcomes were assessed using the Visual Analog Scale (VAS), Disabilities of the Arm, Shoulder, and Hand (DASH), and DASH-Work Model (DASH-WM) scoring systems at the initial examination at the beginning of the study and at two-week, three-month, and six-month follow-up controls.

Results: Similar results were observed between VAS, DASH, and DASH-WM scores measured during LE diagnosis. In the first two weeks of follow-up, statistically significant decreases were observed in VAS, DASH, and DASH-WM scores in all three groups. Compared to baseline values, Group 1 and 2 had significant difference in VAS and DASH scores at three months. Group 3 had a significant difference in all clinical evaluation scores. At six months, no significant difference was observed in Groups 1 and 2 in any of the scoring systems, while Group 3 showed significant improvements in all scoring systems.

Conclusion: Treatment with ESWT was superior to other treatments throughout the study and at the final follow-up. In patients receiving CS injections, the clinical outcomes worsened with time, evidenced by the six-month follow-up. Further studies on combined treatment modalities are needed on this subject.

Keywords: Extracorporeal shock wave therapy, lateral epicondylitis, local massage, corticosteroids.

Introduction:
The lateral epicondyle is the starting point of the extensor muscles of the wrist. Damage to this structure results in fibroblastic proliferation, hyaline degeneration, vascular proliferation, and calcific deposits. This change causes severe elbow pain that increases with repetitive supination and dorsiflexion movements of the hand, wrist, and forearm. Lateral epicondylitis (LE) was described as "lawn tennis arm" in 1873. The etiology of the condition is poorly understood. LE is a common disease with yearly incidence of 1-3% in the general population. Patients with LE are typically 30-55 years old, and the condition's frequency is dependent on age, with peak incidence at 45-64 years. Although LE is also known as "tennis elbow," it is more common in non-athletes. Despite the increase in knowledge about its physiopathology, the optimal treatment remains controversial.

Methods:
This randomized prospective study was conducted at Harran University Faculty of Medicine, Department of Orthopedics and Traumatology, Şanlıurfa, Türkiye. The study included 52 patients who were treated for LE between March 2021 and June 2022. Patients were evaluated using VAS, DASH, and DASH-WM scoring systems during their initial examination and at two-week, three-month, and six-month follow-up periods. Patients in Group 1 (n=17; 9 males, 8 females; mean age: 46.1±10.9 years; range, 27 to 64 years) received local massage therapy, patients in Group 2 (n=17; 7 males, 10 females; mean age: 46.0±8.8 years; range, 28 to 63 years) received CS injection, and patients in Group 3 (n=18; 12 males, 6 females; mean age: 46.7±11.3 years; range, 28 to 68 years) received ESWT.
`;

// System prompt - exactly as used in the app
const systemPrompt = `You are a powerful research assistant with a skill for reading scientific research articles, and understanding what the key findings are from each article. You know how to read an article and provide a human with a TLDR that does not miss any pertinent results from the article. But you provide enough context in your summary that a human can quickly understand the scope and purpose of the study, as well as a clear report of the results/key findings. You include statistics related to key findings, where they are included in the article.  You provide important statistics as mentioned in the article, if they are found in reference to a key finding. You do not invent statistics.

Take the URL provided, and summarize the content providing the following EXACTLY in this format:

### Original Article Title:
[The exact original title of the article. Look for <h1> tags, metadata, or the most prominent heading. For scientific articles, make sure to capture the complete title.]

### Summarized Title:
[A concise, informative title that captures the main discovery or conclusion of the article. This will be displayed as the "AI Summary" on the page, so make it clear and impactful.]

### Visual Summary: 3-10 key points from the article (each starting with a relevant emoji that represents the content of that point). If there are percentages provided in the results or abstract section of the literature, make sure to include them in the summary. The first bullet point should describe what was studied. Make it easy to understand for non-experts.

EXAMPLE ::: (do not use these emojis, use your own, and only use each emoji once):
🧬 Novel mRNA-1273.351 vaccine candidate demonstrated 96.4% efficacy against the Beta variant in phase 3 clinical trials.
🛡️ Neutralizing antibody titers were 4.3-fold higher against the Delta variant compared to the original vaccine formulation.
⏱️ Protection lasted at least 8 months post-vaccination with minimal waning of immunity observed.
🔬 T-cell responses showed cross-reactivity against all tested variants, including Beta, Delta, and Omicron.
💉 Side effect profile was similar to the original mRNA vaccines with no new safety concerns identified.
🦠 Breakthrough infections were 76% less common with the new vaccine candidate compared to the original formulation.
👵 Efficacy in adults over 65 years was 91.3%, showing strong protection in vulnerable populations.
[Add more findings with relevant emojis as needed. Do not default to the same emoji for each key point. Do not use the same emoji for multiple key points.
IMPORTANT: Each key point MUST start with a relevant emoji that represents the content of that point.
Strike a balance between including scientific jargon and providing a summary that is easy to understand for non-experts. ]

### Keywords:
[Generate 5-7 specific keywords that accurately represent the research interests of the article. These keywords will be used to find similar articles, so they must be specifically relevant to the research field, methods, or concepts.

GUIDELINES FOR GOOD KEYWORDS:
- Use specific scientific terms rather than generic ones
- Include specialized research areas, techniques, or biological processes
- Prefer multi-word technical terms that would be used by researchers in the field
- Include specific gene names, diseases, or organisms that are central to the research
- Include methodologies that are significant to the findings

GOOD KEYWORD EXAMPLES:
✓ "intervertebral disc degeneration" (specific condition)
✓ "gut microbiome dysbiosis" (specific area of study)
✓ "CRISPR-Cas9" (specific technique)
✓ "ACE2 receptor" (specific biological component)
✓ "mesenchymal stem cells" (specific cell type)
✓ "chronic systemic inflammation" (specific physiological process)

BAD KEYWORD EXAMPLES:
✗ "therapy" (too generic - specify what kind of therapy)
✗ "medical" (too vague)
✗ "research" (too vague)
✗ "health" (too broad)
✗ "study" (describes format, not content)
✗ "treatment" (too generic - what specific treatment?)

Present keywords as a comma-separated list of specific, research-relevant terms. Each keyword should be precise enough that clicking on it would return meaningfully related articles.]

### Cohort Analysis:
Type of study: [literature review, experiment, etc.]
Duration: [duration of study if applicable]
Date range: [date range of articles if literature review]
Cohort size: [number of participants if applicable - use EXACT number from the article, do not estimate]

Age Distribution:
[IMPORTANT: Only provide age distribution if EXPLICITLY stated in the article. Use the same age ranges as in the article. DO NOT invent or guess percentages. If the article states exact numbers of participants in each age group, calculate the percentages accurately. If only some age information is provided (e.g., "11 out of 14 participants were over 60 years old"), use exactly that age grouping (e.g., "Under 60: 21.4%, 60+: 78.6%").]

Gender:
Male: [percentage - ONLY if explicitly stated in the article]%
Female: [percentage - ONLY if explicitly stated in the article]%

Geographic Distribution:
[IMPORTANT: Only include regions explicitly mentioned in the article with their specific percentages. DO NOT invent regions or percentages. If no other geographic information is mentioned, use any other geographic information (city, state, country, etc) that is available in the article. If no geographic information is available, use "Not specified".]

Notes:
- [Include any specific statements about participant demographics exactly as they appear in the article]
- [Another important note if applicable]

Make sure to include ALL the sections in the format above, even if some fields have limited or no information (indicate with "Not specified" or "Not applicable").
Use semantic emojis at the start of each visual summary point that represent the content of that finding. Never use the same emoji twice.
For keywords, focus on specific scientific topics, methodologies, or biological processes relevant to the article. Assess the quality of each keyword to ensure it would be valuable for finding similar research articles.

IMPORTANT GUIDANCE ON DEMOGRAPHIC DATA:
1. For the Cohort Analysis section, ONLY provide demographic information that is EXPLICITLY stated in the article.
2. DO NOT make up, guess, or estimate demographic percentages if they are not clearly provided.
3. If exact counts are given (e.g., "11 out of 14 participants"), convert to percentages accurately.
4. If only qualitative descriptions are provided (e.g., "majority were female"), note this in text form exactly as stated.
5. For age data, use the same age ranges as mentioned in the article - do not fit data into predefined ranges.
6. If specific demographic statements exist but don't fit the structured format, include them verbatim in the Notes section.`;

// User prompt construction
const userPrompt = `Please summarize this scientific article from the URL: ${articleUrl}.
Make sure to correctly identify and extract the original title of the article exactly as it appears in the source.

The extracted content from the article is provided below:

Title: ${articleTitle}
URL: ${articleUrl}

Article Content:
${articleContent}`;

async function generateSummary() {
  console.log('Generating article summary...');
  
  try {
    // Log API key status (without revealing the actual key)
    if (process.env.OPENAI_API_KEY) {
      console.log('OpenAI API key found in .env.local');
    } else {
      console.log('WARNING: OpenAI API key not found in .env.local');
    }
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
    });
    
    // Extract the full response text
    const summaryText = response.choices[0].message.content;
    
    // Save to file
    fs.writeFileSync('pmc11128959_summary.txt', summaryText);
    console.log('Summary saved to pmc11128959_summary.txt');
    
    // Also print a preview
    console.log('\nSummary Preview (first 500 characters):');
    console.log(summaryText.substring(0, 500) + '...\n');
    
  } catch (error) {
    console.error('Error generating summary:', error);
  }
}

// Run the summary generation
generateSummary();
