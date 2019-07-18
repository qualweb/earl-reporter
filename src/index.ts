'use strict';

import { EvaluationReport } from '@qualweb/core';
import {
  Report,
  EarlReport, 
  TestSubject, 
  Assertor, 
  Assertion
} from '@qualweb/earl-reporter';

import ACTRulesReportToEARL from './lib/act-rules.reporter';
import HTMLTechniquesReportToEARL from './lib/html-techniques.reporter';
import CSSTechniquesReportToEARL from './lib/css-techniques.reporter';

async function generateEarlAssertions(report: Report, date?: string): Promise<Assertion[]> {
  if (report.type === 'act-rules') {
    return await ACTRulesReportToEARL(report, date);
  } else if (report.type === 'html-techniques') {
    return await HTMLTechniquesReportToEARL(report, date);
  } else if (report.type === 'css-techniques') {
    return await CSSTechniquesReportToEARL(report, date);
  } else {
    throw new Error('Invalid report type');
  }
}

async function generateSingleEarlReport(report: EvaluationReport): Promise<EarlReport> {

  const earlReport: EarlReport = {
    context: 'https://act-rules.github.io/earl-context.json', //TODO: change context
    graph: new Array<TestSubject>()
  };

  const assertor: Assertor = {
    '@id': report.system.name,
    '@type': 'Software',
    title: report.system.name,
    description: report.system.description,
    hasVersion: report.system.version,
    homepage: report.system.homepage,

  };

  const testSubject: TestSubject = {
    '@type': 'TestSubject',
    source: report.system.url.completeUrl,
    assertor,
    assertions: new Array<Assertion>()
  };

  if (report.modules['act-rules']) {
    testSubject.assertions = [...testSubject.assertions, ...(await generateEarlAssertions(report.modules['act-rules'], report.system.date))];
  }
  if (report.modules['html-techniques']) {
    testSubject.assertions = [...testSubject.assertions, ...(await generateEarlAssertions(report.modules['html-techniques'], report.system.date))];
  }
  if (report.modules['css-techniques']) {
    testSubject.assertions = [...testSubject.assertions, ...(await generateEarlAssertions(report.modules['css-techniques'], report.system.date))];
  }
  
  return earlReport;
}

async function generateAggregatedEarlReport(reports: EvaluationReport[]): Promise<EarlReport> {
  const aggregatedReport: EarlReport = {
    context: 'https://act-rules.github.io/earl-context.json', //TODO: change context
    graph: new Array<TestSubject>()
  };

  for (const report of reports || []) {
    const earlReport = <EarlReport> await generateSingleEarlReport(report);
    aggregatedReport.graph.push(earlReport.graph[0]);
  }

  return aggregatedReport;
}

export {
  generateEarlAssertions,
  generateSingleEarlReport,
  generateAggregatedEarlReport
};