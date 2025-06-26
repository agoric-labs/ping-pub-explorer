import mermaid from 'mermaid';
import type { Ref } from 'vue';

import {
  CAUSEWAY_DEFAULT_PAGE_SIZE,
  CAUSEWAY_MAXIMUM_PAGE_SIZE,
  IS_NUMBER_REGEX,
  MERMAID_CONTAINER_PADDING,
  ZCF_PREFIX_REGEX,
} from '@/constants';
import type { Interaction, Vat } from '@/stores/useCauseway';

const LINE_NUMBER_ATTRIBUTE_NAME = 'messagelinenumber';
const MESSAGE_NUMBER_ATTRIBUTE_NAME = 'messagenumber';
const PARTICIPANT_GROUP_ID_PREFIX = 'root-';
const PARTICIPANT_LIFELINE_ID_PREFIX = 'actor';
const SVG_NS = 'http://www.w3.org/2000/svg';

const addParticipantTooltips = (svgElement: SVGSVGElement, vats: Array<Vat>) =>
  Array.from(
    svgElement.querySelectorAll<SVGGElement>(
      `g[id^="${PARTICIPANT_GROUP_ID_PREFIX}"]`
    )
  )
    .sort(
      (firstNode, secondNode) =>
        Number(
          firstNode.id.replace(
            new RegExp(`^${PARTICIPANT_GROUP_ID_PREFIX}`),
            ''
          )
        ) -
        Number(
          secondNode.id.replace(
            new RegExp(`^${PARTICIPANT_GROUP_ID_PREFIX}`),
            ''
          )
        )
    )
    .forEach((group, index) => {
      const vatInfo = vats[index];

      const title = document.createElementNS(SVG_NS, 'title');
      title.textContent = vatInfo.name || vatInfo.vatID;

      group.appendChild(title);
    });

const fixAlignments = (svgElement: SVGSVGElement) => {
  const centres: { [key: string]: number } = {};

  const findActor = (x: number) =>
    Object.entries(centres).reduce<{ id: string; dist: number }>(
      (best, [id, cx]) => {
        const d = Math.abs(cx - x);
        return d < best.dist ? { id, dist: d } : best;
      },
      { id: '', dist: Infinity }
    ).id;

  svgElement
    .querySelectorAll<SVGLineElement>(
      `line[id^="${PARTICIPANT_LIFELINE_ID_PREFIX}"]`
    )
    .forEach((line) => {
      centres[
        line.id.replace(new RegExp(`^${PARTICIPANT_LIFELINE_ID_PREFIX}`), '')
      ] = parseFloat(line.getAttribute('x1')!) + 1;
      line.classList.add('dark:!stroke-slate-600', '!stroke-gray-300');
    });

  svgElement
    .querySelectorAll<SVGLineElement>('line[class^="messageLine"]')
    .forEach((line) => {
      const x1 = parseFloat(line.getAttribute('x1')!);
      const x2 = parseFloat(line.getAttribute('x2')!);

      const callerId = findActor(x1);
      const targetId = findActor(x2);

      if (!callerId || !targetId)
        return console.log('Failed to find best actors for: ', line.outerHTML);

      line.setAttribute('x1', String(centres[callerId]));
      line.setAttribute('x2', String(centres[targetId]));
    });
};

const fixMessages = (
  interactions: Array<Interaction>,
  svgElement: SVGSVGElement
) => {
  const messageTooltipMap: { [key: string]: SVGGElement } = {};
  svgElement
    .querySelectorAll<SVGTextElement>('text[class="messageText"]')
    .forEach((textElement) => {
      textElement.style.removeProperty('font-size');
      textElement.classList.add(
        'dark:!fill-slate-400',
        '!fill-gray-600',
        'text-xs'
      );
    });

  svgElement
    .querySelectorAll<SVGLineElement>(`[${LINE_NUMBER_ATTRIBUTE_NAME}]`)
    .forEach((lineElement) => {
      lineElement.classList.add('dark:!stroke-slate-400', '!stroke-gray-600');

      const defaultOpacity = '0';
      const messageNumber = lineElement.getAttribute(
        LINE_NUMBER_ATTRIBUTE_NAME
      )!;

      const interaction = interactions[Number(messageNumber) - 1];
      if (!interaction?.crankNum) return;

      const horizontalPadding = 6;
      const verticalPadding = 3;
      const x =
        Math.max(
          Number(lineElement.getAttribute('x1')),
          Number(lineElement.getAttribute('x2'))
        ) + 16;
      const y = Number(lineElement.getAttribute('y1'));

      const group = document.createElementNS(SVG_NS, 'g');
      group.setAttribute('tooltipLineNumber', messageNumber);
      group.style.opacity = defaultOpacity;

      const toolTip = document.createElementNS(SVG_NS, 'text');
      toolTip.classList.add(...'font-mono text-gray-L900 text-xs'.split(' '));
      toolTip.setAttribute('tooltipLineNumber', messageNumber);
      toolTip.setAttribute('x', String(x));
      toolTip.setAttribute('y', String(y));
      toolTip.textContent = `${interaction.crankNum}@${interaction.targetVat}`;

      group.appendChild(toolTip);
      lineElement.parentElement?.appendChild(group);

      const bbox = toolTip.getBBox();

      const backgroundProvider = document.createElementNS(SVG_NS, 'rect');
      backgroundProvider.setAttribute(
        'height',
        String(bbox.height + verticalPadding * 2)
      );
      backgroundProvider.setAttribute('rx', '2');
      backgroundProvider.setAttribute('ry', '2');
      backgroundProvider.setAttribute(
        'width',
        String(bbox.width + horizontalPadding * 2)
      );
      backgroundProvider.setAttribute('x', String(bbox.x - horizontalPadding));
      backgroundProvider.setAttribute('y', String(bbox.y - verticalPadding));
      backgroundProvider.classList.add(
        ...'fill-yellow-100 stroke-yellow-200'.split(' ')
      );

      group.insertBefore(backgroundProvider, toolTip);

      lineElement.addEventListener(
        'mouseenter',
        () => (group.style.opacity = '1')
      );
      lineElement.addEventListener(
        'mouseleave',
        () => (group.style.opacity = defaultOpacity)
      );

      messageTooltipMap[messageNumber] = group;
    });

  svgElement
    .querySelectorAll<SVGTextElement>(`[${MESSAGE_NUMBER_ATTRIBUTE_NAME}]`)
    .forEach((textElement) => {
      const messageNumber = textElement.getAttribute(
        MESSAGE_NUMBER_ATTRIBUTE_NAME
      )!;

      const toolTip = messageTooltipMap[messageNumber];
      if (!toolTip) return;

      textElement.addEventListener(
        'mouseenter',
        () => (toolTip.style.opacity = '1')
      );
      textElement.addEventListener(
        'mouseleave',
        () => (toolTip.style.opacity = '0')
      );
    });

  svgElement
    .getElementById('arrowhead')
    .children.item(0)
    ?.classList.add(
      'dark:!fill-slate-400',
      'dark:!stroke-slate-400',
      '!fill-gray-600',
      '!stroke-gray-600'
    );
};

const generateInteractions = (interactions: Interaction[], vats: Vat[]) => {
  let result = '';

  const vatIds = new Set();
  vats.forEach((vat) => vatIds.add(vat.vatID));

  interactions.forEach((interaction) => {
    const {
      argSize,
      blockHeight,
      elapsed,
      method,
      promiseId,
      sourceVat,
      targetId,
      targetVat,
      type,
    } = interaction;

    if (!(vatIds.has(sourceVat) && vatIds.has(targetVat)))
      return console.error(
        `[FATAL]: Either ${sourceVat} or ${targetVat} not found in known vat IDs`
      );

    if (type === 'syscall') {
      const methodDisplay =
        method && method.length > 20 ? `${method.substring(0, 20)}...` : method;

      result += `    ${getMermaidId(sourceVat)}->>>${getMermaidId(targetVat)}: ${methodDisplay}\n`;
    } else {
      const methodDisplay =
        method && method.length > 25 ? method.substring(0, 25) + '...' : method;

      result += [
        getMermaidId(sourceVat),
        type === 'notify' ? '-->>+' : '->>+',
        getMermaidId(targetVat),
        `: ${blockHeight} ${Math.round(elapsed * 1000) / 1000} `,
        promiseId && `${promiseId} <-`,
        targetId,
        '.',
        methodDisplay.replace(/[^\w\s\-.,;:()]/g, '_'),
        `(${argSize || ''})`,
        '\n',
      ]
        .filter(Boolean)
        .join('');
    }
  });

  return result;
};

const getMermaidId = (vatId: string) => `Vat_${vatId.replace(/[^\w]/g, '_')}`;

export const getSanitizedPageSize = (pageSize: string) =>
  Math.min(
    CAUSEWAY_MAXIMUM_PAGE_SIZE,
    String(pageSize || '').match(IS_NUMBER_REGEX)
      ? Number(pageSize)
      : CAUSEWAY_DEFAULT_PAGE_SIZE
  );

export const generateMermaidSequenceDiagram = (
  interactions: Array<Interaction>,
  vats: Array<Vat>
) =>
  [
    'sequenceDiagram',
    generateParticipants(vats),
    generateInteractions(
      interactions.sort((a, b) => a.time - b.time),
      vats
    ),
  ].join('\n');

const generateParticipants = (vats: Vat[]): string =>
  vats
    .map(
      (vat) =>
        `    participant ${getMermaidId(vat.vatID)} as ${
          vat.vatID !== vat.name
            ? `${vat.vatID}:${truncate(vat.name.replace(ZCF_PREFIX_REGEX, ''))}`
            : vat.vatID
        }`
    )
    .join('\n');

type RenderDiagramArgs = {
  code: string;
  containerHeight: number;
  interactions: Array<Interaction>;
  mermaidRef: Ref<HTMLDivElement | null>;
  vats: Array<Vat>;
};

export const renderDiagram = async ({
  code,
  containerHeight,
  interactions,
  mermaidRef,
  vats,
}: RenderDiagramArgs) => {
  if (!(code && mermaidRef.value)) return;

  try {
    const { svg } = await mermaid.render('mermaid-svg', code, mermaidRef.value);
    mermaidRef.value.innerHTML = svg;

    const svgElement = mermaidRef.value.querySelector('svg');

    if (svgElement) {
      svgElement.classList.add('flex-shrink-0', '!max-w-none', 'mx-auto');
      const { height: svgHeight, width: svgWidth } = svgElement.getBBox();
      svgElement.style.height = `${Math.max(svgHeight, containerHeight - 2 * MERMAID_CONTAINER_PADDING)}px`;
      svgElement.style.width = `${svgWidth}px`;

      addParticipantTooltips(svgElement, vats);
      fixAlignments(svgElement);
      fixMessages(interactions, svgElement);
    }
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error('Mermaid rendering error:', error);
    mermaidRef.value.innerHTML = `
      <div class="border border-red-500 border-solid flex flex-col gap-y-3 p-3 rounded-sm text-red-500">
        <strong>Error rendering diagram:</strong>
        <p>${errorMessage}</p>
      </div>
    `;
  }
};

const truncate = (name: string, maxLength = 15) =>
  name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
