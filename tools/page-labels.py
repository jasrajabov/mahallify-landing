#!/usr/bin/env python3
"""Copy the app's own words for page kinds into the /p/ page function.

The post page (functions/p/[kind]/[id].js) names a professional's specialty,
a business's category and a community page's category the way the app does.
Those lists are long (69 specialties, 81 business categories) and change with
the app, so they are generated from the app's i18n bundles rather than typed
by hand, and written between the GENERATED LABELS markers in that file.

    python3 tools/page-labels.py [APP_DIR]

Default APP_DIR is ../mahallify (the app repo beside this one). Re-run it when
the app adds a specialty or a category; a key the page does not know simply
prints nothing (or the member's own words, for a specialty).
"""

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(HERE, '..', 'functions', 'p', '[kind]', '[id].js')
BEGIN = '// ── BEGIN GENERATED LABELS (tools/page-labels.py) ──'
END = '// ── END GENERATED LABELS ──'
LANGS = ('en', 'ru', 'uz')


def keys_of(src, name):
    """The `key:` values of one `NAME: Type[] = [ … ];` table."""
    start = src.index(f'{name}: ')
    body = src[start:src.index('];', start)]
    return re.findall(r"key: '([a-z_]+)'", body)


def main():
    app = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'mahallify'))
    categories = open(os.path.join(app, 'src', 'utils', 'categories.ts'), encoding='utf-8').read()
    biz_keys = keys_of(categories, 'BUSINESS_CATEGORY_META')
    org_keys = keys_of(categories, 'ORG_CATEGORY_META')

    labels = {}
    for lang in LANGS:
        d = json.load(open(os.path.join(app, 'src', 'i18n', f'{lang}.json'), encoding='utf-8'))
        pro = d['professional']
        labels[lang] = {
            'spec': pro['spec'],
            # A pre-2.0 row has no specialties: "Medical Professional".
            'proCategory': pro['categories'],
            'craft': pro['craftLine'],
            'years': pro['join']['yrsLong'],
            'biz': {k: d['directory'][k] for k in biz_keys if k in d['directory']},
            'org': {k: d['orgs'][k] for k in org_keys if k in d['orgs']},
        }

    # State and province names, as the app's src/lib/regions.ts spells them.
    regions_src = open(os.path.join(app, 'src', 'lib', 'regions.ts'), encoding='utf-8').read()
    regions = dict(re.findall(r"abbr: '([A-Z]{2})', name: '([^']+)'", regions_src))

    block = '\n'.join([
        BEGIN,
        '// The app\'s words for specialties and page categories, from its src/i18n',
        '// bundles, and its state names. Do not edit by hand: re-run the tool.',
        'const LABELS = ' + json.dumps(labels, ensure_ascii=False, indent=2, sort_keys=True) + ';',
        'const REGIONS = ' + json.dumps(regions, ensure_ascii=False, sort_keys=True) + ';',
        END,
    ])

    page = open(TARGET, encoding='utf-8').read()
    if BEGIN not in page or END not in page:
        sys.exit(f'markers not found in {TARGET}')
    head = page[:page.index(BEGIN)]
    tail = page[page.index(END) + len(END):]
    open(TARGET, 'w', encoding='utf-8').write(head + block + tail)
    counts = {k: len(v) for k, v in labels['en'].items() if isinstance(v, dict)}
    print(f'wrote labels: {counts}, regions: {len(regions)}')


if __name__ == '__main__':
    main()
