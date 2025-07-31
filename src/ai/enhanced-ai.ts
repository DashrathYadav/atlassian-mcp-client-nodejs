import { GoogleGenAI } from '@google/genai';

export interface AIAnalysis {
    currentUnderstanding: string;
    accomplished: string;
    remaining: string;
    confidence: number;
    challenges: string[];
    opportunities: string[];
}

export interface UIAction {
    id: string;
    label: string;
    tool: string;
    parameters: Record<string, any>;
    reasoning: string;
    confidence: number;
    alternatives?: UIAction[];
}

export interface ValidationResult {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
    dataQuality: 'excellent' | 'good' | 'poor' | 'failed';
}

export interface OptimizationPlan {
    shouldChangeStrategy: boolean;
    reasoning: string;
    newStrategy?: string;
    improvements: string[];
}

export interface RecoveryAction extends UIAction {
    recoveryType: 'retry' | 'alternative' | 'fallback';
    originalError: string;
}

export interface ExecutionContext {
    variables: Record<string, any>;
    accumulatedData: any[];
    availableTools: ToolInfo[];
    iterationCount: number;
    strategy: string;
    progress: {
        completed: number;
        total: number;
        percentage: number;
    };
    insights: string[];
}

export interface ToolInfo {
    name: string;
    description: string;
}

export class EnhancedAI {
    private ai: GoogleGenAI;
    private model: string;

    constructor(apiKey: string, model: string = 'gemini-2.0-flash-001') {
        this.ai = new GoogleGenAI({ apiKey });
        this.model = model;
    }

    async testConnection(): Promise<void> {
        try {
            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: 'Hello from Gemini AI!',
                config: {
                    temperature: 0.1,
                    maxOutputTokens: 50
                }
            });
            
            if (!response.text) {
                throw new Error('No response from Gemini AI');
            }
        } catch (error) {
            throw new Error(`Gemini AI connection failed: ${error}`);
        }
    }

    async analyzeContext(history: any): Promise<AIAnalysis> {
        const prompt = `
    Analyze the current execution context and provide strategic insights:
    
    Original Query: ${history.originalQuery}
    Current Step: ${history.steps.length + 1}
    Accumulated Data: ${JSON.stringify(history.context.accumulatedData)}
    Previous Results: ${JSON.stringify(history.steps.map((s: any) => s.result))}
    
    Provide a detailed analysis in JSON format with the following structure:
    {
      "currentUnderstanding": "What we understand about the task so far",
      "accomplished": "What has been successfully completed",
      "remaining": "What still needs to be done",
      "confidence": 85,
      "challenges": ["List of potential challenges"],
      "opportunities": ["List of optimization opportunities"]
    }
    
    Focus on:
    1. Current understanding of the task
    2. What has been accomplished so far
    3. What still needs to be done
    4. Potential challenges or edge cases
    5. Optimization opportunities
    6. Confidence level in current approach (0-100)
    
    Respond with valid JSON only.
    `;

        try {
            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: prompt,
                config: {
                    temperature: 0.1,
                    maxOutputTokens: 1000,
                    topP: 0.8,
                    topK: 10
                }
            });

            const responseText = response.text;
            if (!responseText) {
                throw new Error('Empty response from Gemini');
            }

            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error('Invalid JSON response from AI');
        } catch (error) {
            console.error('Error analyzing context:', error);
            return {
                currentUnderstanding: 'Unable to analyze context',
                accomplished: 'Unknown',
                remaining: 'Unknown',
                confidence: 0,
                challenges: ['Analysis failed'],
                opportunities: []
            };
        }
    }

    async suggestNextAction(context: ExecutionContext): Promise<UIAction> {
        const prompt = `
    Based on the current context, suggest the optimal next action:
    
    Context: ${JSON.stringify(context)}
    Available Tools: ${JSON.stringify(context.availableTools)}
    
    Consider:
    1. What will provide the most valuable information?
    2. What will bring us closest to the goal?
    3. What might reveal edge cases or issues?
    4. What will validate our current assumptions?
    
    Provide the best next action in JSON format:
    {
      "id": "unique_action_id",
      "label": "Human readable action description",
      "tool": "exact_tool_name_from_available_tools",
      "parameters": {
        "param1": "value1"
      },
      "reasoning": "Detailed explanation of why this action is best",
      "confidence": 90,
      "alternatives": [
        {
          "id": "alt_1",
          "label": "Alternative action description",
          "tool": "alternative_tool",
          "parameters": {},
          "reasoning": "Why this alternative might be good",
          "confidence": 75
        }
      ]
    }
    
    Important: Use exact tool names from the available tools list. Don't include cloudId in parameters - it will be added automatically.
    
    Respond with valid JSON only.
    `;

        try {
            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: prompt,
                config: {
                    temperature: 0.1,
                    maxOutputTokens: 1000,
                    topP: 0.8,
                    topK: 10
                }
            });

            const responseText = response.text;
            if (!responseText) {
                throw new Error('Empty response from Gemini');
            }

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error('Invalid JSON response from AI');
        } catch (error) {
            console.error('Error suggesting next action:', error);
            return {
                id: 'fallback_action',
                label: 'Fallback action',
                tool: 'getAccessibleAtlassianResources',
                parameters: {},
                reasoning: 'Fallback due to AI error',
                confidence: 0
            };
        }
    }

    async validateResult(action: UIAction, result: any): Promise<ValidationResult> {
        const prompt = `
    Validate if this action result is successful and complete:
    
    Action: ${JSON.stringify(action)}
    Result: ${JSON.stringify(result)}
    
    Check for:
    1. Success/failure indicators
    2. Missing or incomplete data
    3. Error messages or warnings
    4. Expected vs actual results
    5. Data quality issues
    
    Respond with JSON:
    {
      "isValid": true/false,
      "issues": ["List of issues found"],
      "suggestions": ["List of suggestions"],
      "dataQuality": "excellent|good|poor|failed"
    }
    
    Respond with valid JSON only.
    `;

        try {
            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: prompt,
                config: {
                    temperature: 0.1,
                    maxOutputTokens: 1000,
                    topP: 0.8,
                    topK: 10
                }
            });

            const responseText = response.text;
            if (!responseText) {
                throw new Error('Empty response from Gemini');
            }

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error('Invalid JSON response from AI');
        } catch (error) {
            console.error('Error validating result:', error);
            return {
                isValid: false,
                issues: ['Validation failed'],
                suggestions: ['Check the result manually'],
                dataQuality: 'failed'
            };
        }
    }

    async optimizeStrategy(history: any): Promise<OptimizationPlan> {
        const prompt = `
    Analyze the execution history and suggest strategy optimizations:
    
    History: ${JSON.stringify(history)}
    
    Look for:
    1. Inefficient patterns
    2. Missed opportunities
    3. Better approaches
    4. Redundant steps
    5. Performance improvements
    
    Respond with JSON:
    {
      "shouldChangeStrategy": true/false,
      "reasoning": "Explanation of why strategy should change",
      "newStrategy": "New strategy description if applicable",
      "improvements": ["List of specific improvements"]
    }
    
    Respond with valid JSON only.
    `;

        try {
            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: prompt,
                config: {
                    temperature: 0.1,
                    maxOutputTokens: 1000,
                    topP: 0.8,
                    topK: 10
                }
            });

            const responseText = response.text;
            if (!responseText) {
                throw new Error('Empty response from Gemini');
            }

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error('Invalid JSON response from AI');
        } catch (error) {
            console.error('Error optimizing strategy:', error);
            return {
                shouldChangeStrategy: false,
                reasoning: 'Unable to analyze strategy',
                improvements: []
            };
        }
    }

    async generateInsights(data: any[]): Promise<string[]> {
        const prompt = `
    Analyze the accumulated data and generate insights:
    
    Data: ${JSON.stringify(data)}
    
    Generate 2-3 key insights about:
    1. Patterns in the data
    2. Important findings
    3. Potential issues or opportunities
    4. Recommendations for next steps
    
    Respond with a JSON array of insight strings:
    ["Insight 1", "Insight 2", "Insight 3"]
    
    Respond with valid JSON only.
    `;

        try {
            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: prompt,
                config: {
                    temperature: 0.3,
                    maxOutputTokens: 1000,
                    topP: 0.9
                }
            });

            const responseText = response.text;
            if (!responseText) {
                throw new Error('Empty response from Gemini');
            }

            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error('Invalid JSON response from AI');
        } catch (error) {
            console.error('Error generating insights:', error);
            return ['Unable to generate insights'];
        }
    }

    async suggestRecoveryAction(validation: ValidationResult, history: any): Promise<RecoveryAction | null> {
        const prompt = `
    Suggest a recovery action based on the validation failure:
    
    Validation Issues: ${JSON.stringify(validation.issues)}
    Execution History: ${JSON.stringify(history)}
    Available Tools: ${JSON.stringify(history.context.availableTools)}
    
    Suggest a recovery action in JSON format:
    {
      "id": "recovery_action_id",
      "label": "Recovery action description",
      "tool": "tool_name",
      "parameters": {},
      "reasoning": "Why this recovery action should work",
      "confidence": 85,
      "recoveryType": "retry|alternative|fallback",
      "originalError": "Description of the original error"
    }
    
    If no recovery is possible, return null.
    
    Respond with valid JSON or "null".
    `;

        try {
            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: prompt,
                config: {
                    temperature: 0.1,
                    maxOutputTokens: 1000,
                    topP: 0.8,
                    topK: 10
                }
            });

            const responseText = response.text?.trim() || '';
            if (!responseText) {
                throw new Error('Empty response from Gemini');
            }

            if (responseText === 'null') {
                return null;
            }

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error('Invalid JSON response from AI');
        } catch (error) {
            console.error('Error suggesting recovery action:', error);
            return null;
        }
    }

    async checkCompletion(history: any): Promise<{ isComplete: boolean; reason: string }> {
        const prompt = `
    Check if the execution is complete based on the original query and current state:
    
    Original Query: ${history.originalQuery}
    Current State: ${JSON.stringify(history.context)}
    Steps Taken: ${JSON.stringify(history.steps)}
    
    Determine if the task is complete by checking:
    1. Has the original query been fully addressed?
    2. Are there any remaining tasks?
    3. Have all necessary data been collected?
    4. Are there any pending actions?
    
    Respond with JSON:
    {
      "isComplete": true/false,
      "reason": "Explanation of completion status"
    }
    
    Respond with valid JSON only.
    `;

        try {
            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: prompt,
                config: {
                    temperature: 0.1,
                    maxOutputTokens: 1000,
                    topP: 0.8,
                    topK: 10
                }
            });

            const responseText = response.text;
            if (!responseText) {
                throw new Error('Empty response from Gemini');
            }

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error('Invalid JSON response from AI');
        } catch (error) {
            console.error('Error checking completion:', error);
            return {
                isComplete: false,
                reason: 'Unable to determine completion status'
            };
        }
    }

    async generateResponse(prompt: string): Promise<string> {
        try {
            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: prompt,
                config: {
                    temperature: 0.7,
                    maxOutputTokens: 2000,
                    topP: 0.9,
                    topK: 40
                }
            });

            return response.text || 'No response generated';
        } catch (error) {
            console.error('Error generating response:', error);
            return 'Unable to generate response';
        }
    }
} 