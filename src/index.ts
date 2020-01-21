'use strict';

import cloneDeep from 'lodash.clonedeep';
import { EvaluationReport } from '@qualweb/core';
import {
  Report,
  EarlReport,
  EarlContext,
  TestSubject, 
  Assertor, 
  Assertion,
  EarlOptions
} from '@qualweb/earl-reporter';

import ACTRulesReportToEARL from './lib/act-rules.reporter';
import HTMLTechniquesReportToEARL from './lib/html-techniques.reporter';
import CSSTechniquesReportToEARL from './lib/css-techniques.reporter';
import BestPracticesReportToEARL from './lib/best-practices.reporter';

const context: EarlContext = {
  '@context': {
    '@vocab': 'http://www.w3.org/ns/earl#',
    'earl': 'http://www.w3.org/ns/earl#',
    'WCAG20': 'http://www.w3.org/TR/WCAG20/#',
    'WCAG21': 'http://www.w3.org/TR/WCAG21/#',
    'dct': 'http://purl.org/dc/terms/',
    'sch': 'https://schema.org/',
    'doap': 'http://usefulinc.com/ns/doap#',
    'foaf': 'http://xmlns.com/foaf/0.1/',
    'WebPage': 'sch:WebPage',
    'url': 'dct:source',
    'source': 'dct:source',
    'redirectedTo': 'dct:source',
    'assertions': {
      '@reverse': 'subject'
    },
    'assertedBy': {
      '@type': '@id'
    },
    'outcome': {
      '@type': '@id'
    },
    'mode': {
      '@type': '@id'
    },
    'pointer': {
      '@type': 'ptr:CSSSelectorPointer'
    },
    'title': {
      '@type': 'dct:title'
    }
  }
};

async function generateEARLAssertions(report: Report, date?: string): Promise<Assertion[]> {
  switch(report.type) {
    case 'act-rules':
      return await ACTRulesReportToEARL(report, date);
    case 'html-techniques':
      return await HTMLTechniquesReportToEARL(report, date);
    case 'css-techniques':
      return await CSSTechniquesReportToEARL(report, date);
    case 'best-practices':
      return await BestPracticesReportToEARL(report, date);
    default:
      throw new Error('Invalid report type');
  }
}

function reportModule(module: string, options?: EarlOptions): boolean {
  if (!options || !options.modules) {
    return true;
  } else {
    switch(module) {
      case 'act':
        return !!options.modules.act;
      case 'html':
        return !!options.modules.html;
      case 'css':
        return !!options.modules.css;
      case 'best-practices':
        return !!options.modules['best-practices'];
      default:
        return false;
    }
  }
}

async function generateSingleEarlReport(report: EvaluationReport, options?: EarlOptions): Promise<EarlReport> {

  const earlReport: EarlReport = {
    '@context': context,
    '@graph': new Array<TestSubject>()
  };

  const assertor: Assertor = {
    '@id': report.system.name,
    '@type': 'Software',
    title: report.system.name,
    description: report.system.description,
    hasVersion: report.system.version,
    homepage: report.system.homepage
  };

  const testSubject: TestSubject = {
    '@type': 'TestSubject',
    source: report.system.url.inputUrl,
    assertor,
    assertions: new Array<Assertion>()
  };

  if (report.system.url.inputUrl !== report.system.url.completeUrl) {
    testSubject.redirectedTo = report.system.url.completeUrl;
  }

  if (report.modules['act-rules'] && reportModule('act', options)) {
    testSubject.assertions = [
      ...testSubject.assertions, 
      ...(await generateEARLAssertions(report.modules['act-rules'], report.system.date))
    ];
  }
  if (report.modules['html-techniques'] && reportModule('html', options)) {
    testSubject.assertions = [
      ...testSubject.assertions, 
      ...(await generateEARLAssertions(report.modules['html-techniques'], report.system.date))
    ];
  }
  if (report.modules['css-techniques'] && reportModule('css', options)) {
    testSubject.assertions = [
      ...testSubject.assertions, 
      ...(await generateEARLAssertions(report.modules['css-techniques'], report.system.date))
    ];
  }
  if (report.modules['best-practices'] && reportModule('best-practices', options)) {
    testSubject.assertions = [
      ...testSubject.assertions, 
      ...(await generateEARLAssertions(report.modules['best-practices'], report.system.date))
    ];
  }

  earlReport['@graph'].push(cloneDeep(testSubject));

  return earlReport;
}

async function generateAggregatedEarlReport(reports: EvaluationReport[], options?: EarlOptions): Promise<EarlReport> {
  const aggregatedReport: EarlReport = {
    '@context': context,
    '@graph': new Array<TestSubject>()
  };

  for (const report of reports || []) {
    const earlReport = await generateSingleEarlReport(report, options);
    aggregatedReport['@graph'].push(cloneDeep(earlReport['@graph'][0]));
  }

  return aggregatedReport;
}

async function generateEARLReport(reports: {[url: string]: EvaluationReport}, options?: EarlOptions): Promise<{ [url: string]: EarlReport}> {
  const earlReports: {[url: string]: EarlReport} = {};
  if (options && options.aggregated) {
    const firstUrl = Object.keys(reports)[0];
    earlReports[options.aggregatedName || firstUrl] = await generateAggregatedEarlReport(Object.values(reports), options);
  } else {
    for (const url in reports || {}) {
      const earlReport = await generateSingleEarlReport(reports[url], options);
      earlReports[url] = cloneDeep(earlReport);
    }
  }
  return cloneDeep(earlReports);
}

export {
  generateEARLAssertions,
  generateEARLReport
};