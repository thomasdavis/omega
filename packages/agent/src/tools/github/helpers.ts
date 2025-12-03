/**
 * Helper functions for GitHub tools
 */

/**
 * Helper function to find and close PRs associated with an issue
 */
export async function closeAssociatedPRs(
  issueNumber: number,
  GITHUB_TOKEN: string,
  GITHUB_REPO: string
): Promise<{ closedPRs: number[]; deletedBranches: string[] }> {
  const closedPRs: number[] = [];
  const deletedBranches: string[] = [];

  try {
    // Search for PRs that reference this issue in the body
    // GitHub search API: https://docs.github.com/en/rest/search/search
    const searchQuery = `repo:${GITHUB_REPO} is:pr is:open ${issueNumber} in:body`;
    const searchResponse = await fetch(
      `https://api.github.com/search/issues?q=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!searchResponse.ok) {
      console.warn(`Failed to search for PRs: ${searchResponse.status}`);
      return { closedPRs, deletedBranches };
    }

    const searchData: any = await searchResponse.json();
    const prs = searchData.items || [];

    // Also check for PRs from branches matching claude/issue-{issueNumber}-*
    const branchPattern = `claude/issue-${issueNumber}-`;
    const branchSearchResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/pulls?state=open&per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (branchSearchResponse.ok) {
      const allPRs: any = await branchSearchResponse.json();
      const branchPRs = allPRs.filter((pr: any) =>
        pr.head && pr.head.ref && pr.head.ref.startsWith(branchPattern)
      );

      // Merge with search results, avoiding duplicates
      for (const pr of branchPRs) {
        if (!prs.find((p: any) => p.number === pr.number)) {
          prs.push(pr);
        }
      }
    }

    // Close each PR and delete its branch
    for (const pr of prs) {
      try {
        // Close the PR
        const closeResponse = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/pulls/${pr.number}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github+json',
              'Content-Type': 'application/json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
            body: JSON.stringify({ state: 'closed' }),
          }
        );

        if (closeResponse.ok) {
          closedPRs.push(pr.number);
          console.log(`✅ Closed PR #${pr.number}`);

          // Delete the branch if it exists and head.ref is available
          if (!pr.head || !pr.head.ref) {
            console.log(`⏭️  Skipping branch deletion for PR #${pr.number} (head branch already deleted)`);
            continue;
          }

          const branchName = pr.head.ref;
          const deleteResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/${branchName}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
              },
            }
          );

          if (deleteResponse.ok || deleteResponse.status === 404) {
            deletedBranches.push(branchName);
            console.log(`✅ Deleted branch ${branchName}`);
          } else {
            console.warn(`Failed to delete branch ${branchName}: ${deleteResponse.status}`);
          }
        } else {
          console.warn(`Failed to close PR #${pr.number}: ${closeResponse.status}`);
        }
      } catch (prError) {
        console.error(`Error processing PR #${pr.number}:`, prError);
      }
    }
  } catch (error) {
    console.error('Error closing associated PRs:', error);
  }

  return { closedPRs, deletedBranches };
}
