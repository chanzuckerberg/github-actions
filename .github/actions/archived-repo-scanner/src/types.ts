export interface GitHubRepo {
  owner: string;
  name: string;
  url: string;
  archived?: boolean;
}

export interface RepoReference {
  repo: GitHubRepo;
  locations: FileLocation[];
}

export interface FileLocation {
  file: string;
  line: number;
  column: number;
  context: string;
}

export interface SarifResult {
  ruleId: string;
  message: {
    text: string;
  };
  level: 'error' | 'warning' | 'note';
  locations: SarifLocation[];
  properties?: {
    tags?: string[];
  };
}

export interface SarifLocation {
  physicalLocation: {
    artifactLocation: {
      uri: string;
    };
    region: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    };
    contextRegion?: {
      startLine: number;
      endLine: number;
      snippet: {
        text: string;
      };
    };
  };
}

export interface SarifRule {
  id: string;
  name: string;
  shortDescription: {
    text: string;
  };
  fullDescription: {
    text: string;
  };
  defaultConfiguration: {
    level: 'error' | 'warning' | 'note';
  };
  help: {
    text: string;
    markdown: string;
  };
  properties: {
    tags: string[];
    'security-severity': string;
  };
}

export interface SarifReport {
  version: string;
  $schema: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: SarifRule[];
      };
    };
    results: SarifResult[];
  }>;
}
