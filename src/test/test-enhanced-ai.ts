import chalk from 'chalk';
import dotenv from 'dotenv';
import { EnhancedAI } from '../ai/enhanced-ai';

// Load environment variables
dotenv.config();

async function testEnhancedAI() {
    console.log(chalk.blue.bold('🧪 Testing Enhanced AI Integration'));
    console.log(chalk.gray('=====================================\n'));

    if (!process.env['GEMINI_API_KEY']) {
        console.error(chalk.red('❌ GEMINI_API_KEY not found in environment variables'));
        console.log(chalk.yellow('💡 Please set GEMINI_API_KEY to test the enhanced AI'));
        return;
    }

    const ai = new EnhancedAI(process.env['GEMINI_API_KEY']);

    // Mock execution history for testing
    const mockHistory = {
        originalQuery: 'Find all high priority bugs and assign them to John',
        steps: [
            {
                stepNumber: 1,
                timestamp: new Date(),
                action: {
                    tool: 'searchJiraIssuesUsingJql',
                    parameters: { jql: 'priority = High AND type = Bug' },
                    reasoning: 'Search for high priority bugs'
                },
                result: {
                    success: true,
                    data: [
                        { id: 'BUG-1', summary: 'Login issue', assignee: 'Alice' },
                        { id: 'BUG-2', summary: 'Database error', assignee: null }
                    ],
                    duration: 500
                },
                aiDecision: {
                    nextAction: 'Check assignees',
                    reasoning: 'Need to see which bugs are unassigned',
                    confidence: 85
                }
            }
        ],
        context: {
            variables: { targetAssignee: 'John' },
            accumulatedData: [
                {
                    type: 'searchJiraIssuesUsingJql',
                    content: [
                        { id: 'BUG-1', summary: 'Login issue', assignee: 'Alice' },
                        { id: 'BUG-2', summary: 'Database error', assignee: null }
                    ],
                    timestamp: new Date(),
                    summary: { count: 2, type: 'array', sample: ['BUG-1', 'BUG-2'] }
                }
            ],
            availableTools: [
                { name: 'getJiraIssue', description: 'Get a specific Jira issue' },
                { name: 'updateJiraIssue', description: 'Update a Jira issue' },
                { name: 'searchJiraIssuesUsingJql', description: 'Search Jira issues using JQL' }
            ],
            iterationCount: 1,
            strategy: 'find_and_assign',
            progress: { completed: 1, total: 3, percentage: 33 },
            insights: ['Found 2 high priority bugs, 1 is unassigned']
        }
    };

    const mockContext = {
        variables: { targetAssignee: 'John' },
        accumulatedData: [
            {
                type: 'searchJiraIssuesUsingJql',
                content: [
                    { id: 'BUG-1', summary: 'Login issue', assignee: 'Alice' },
                    { id: 'BUG-2', summary: 'Database error', assignee: null }
                ]
            }
        ],
        availableTools: [
            { name: 'getJiraIssue', description: 'Get a specific Jira issue' },
            { name: 'updateJiraIssue', description: 'Update a Jira issue' },
            { name: 'searchJiraIssuesUsingJql', description: 'Search Jira issues using JQL' }
        ],
        iterationCount: 1,
        strategy: 'find_and_assign',
        progress: { completed: 1, total: 3, percentage: 33 },
        insights: ['Found 2 high priority bugs, 1 is unassigned']
    };

    try {
        // Test 1: Context Analysis
        console.log(chalk.cyan('1. Testing Context Analysis...'));
        const analysis = await ai.analyzeContext(mockHistory);
        console.log(chalk.green('✅ Context Analysis:'));
        console.log(chalk.gray(`   Understanding: ${analysis.currentUnderstanding}`));
        console.log(chalk.gray(`   Accomplished: ${analysis.accomplished}`));
        console.log(chalk.gray(`   Remaining: ${analysis.remaining}`));
        console.log(chalk.gray(`   Confidence: ${analysis.confidence}%`));

        // Test 2: Next Action Suggestion
        console.log(chalk.cyan('\n2. Testing Next Action Suggestion...'));
        const suggestedAction = await ai.suggestNextAction(mockContext);
        console.log(chalk.green('✅ Suggested Action:'));
        console.log(chalk.gray(`   Label: ${suggestedAction.label}`));
        console.log(chalk.gray(`   Tool: ${suggestedAction.tool}`));
        console.log(chalk.gray(`   Reasoning: ${suggestedAction.reasoning}`));
        console.log(chalk.gray(`   Confidence: ${suggestedAction.confidence}%`));

        // Test 3: Result Validation
        console.log(chalk.cyan('\n3. Testing Result Validation...'));
        const mockResult = {
            success: true,
            data: { id: 'BUG-2', summary: 'Database error', assignee: 'John' },
            duration: 300
        };
        const validation = await ai.validateResult(suggestedAction, mockResult);
        console.log(chalk.green('✅ Result Validation:'));
        console.log(chalk.gray(`   Valid: ${validation.isValid}`));
        console.log(chalk.gray(`   Data Quality: ${validation.dataQuality}`));
        if (validation.issues.length > 0) {
            console.log(chalk.gray(`   Issues: ${validation.issues.join(', ')}`));
        }

        // Test 4: Strategy Optimization
        console.log(chalk.cyan('\n4. Testing Strategy Optimization...'));
        const optimization = await ai.optimizeStrategy(mockHistory);
        console.log(chalk.green('✅ Strategy Optimization:'));
        console.log(chalk.gray(`   Should Change: ${optimization.shouldChangeStrategy}`));
        console.log(chalk.gray(`   Reasoning: ${optimization.reasoning}`));
        if (optimization.improvements.length > 0) {
            console.log(chalk.gray(`   Improvements: ${optimization.improvements.join(', ')}`));
        }

        // Test 5: Insight Generation
        console.log(chalk.cyan('\n5. Testing Insight Generation...'));
        const insights = await ai.generateInsights(mockContext.accumulatedData);
        console.log(chalk.green('✅ Generated Insights:'));
        insights.forEach((insight, index) => {
            console.log(chalk.gray(`   ${index + 1}. ${insight}`));
        });

        // Test 6: Completion Check
        console.log(chalk.cyan('\n6. Testing Completion Check...'));
        const completionCheck = await ai.checkCompletion(mockHistory);
        console.log(chalk.green('✅ Completion Check:'));
        console.log(chalk.gray(`   Is Complete: ${completionCheck.isComplete}`));
        console.log(chalk.gray(`   Reason: ${completionCheck.reason}`));

        console.log(chalk.green.bold('\n🎉 All Enhanced AI tests completed successfully!'));

    } catch (error) {
        console.error(chalk.red('❌ Enhanced AI test failed:'), error);
    }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testEnhancedAI().catch(console.error);
}

export { testEnhancedAI }; 