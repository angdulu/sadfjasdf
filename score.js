export function parseInterval(text) {
    if (!text || typeof text !== 'string') {
        return null;
    }
    const normalized = text.replace(/\s+/g, '').replaceAll('–', '-');
    const match = normalized.match(/^(\d*\.?\d+)-(\d*\.?\d+)$/);
    if (!match) {
        return null;
    }
    const low = Number(match[1]);
    const high = Number(match[2]);
    if (!Number.isFinite(low) || !Number.isFinite(high)) {
        return null;
    }
    return { low, high };
}

export function intervalIsValid(text) {
    const interval = parseInterval(text);
    if (!interval) {
        return false;
    }
    return interval.low >= 0 && interval.high <= 1 && interval.low <= interval.high;
}

export function scoreItem(item) {
    const exposureAvailability = item?.exposure?.availability?.value || 'Missing';
    const exposureMissing = exposureAvailability.toLowerCase() === 'missing';
    if (exposureMissing) {
        return {
            level: 'Indeterminate',
            indeterminate: true,
            reason: 'Exposure missing'
        };
    }

    const riskLevel = item?.risk?.level?.value || 'Unknown';
    return {
        level: riskLevel,
        indeterminate: false,
        reason: 'Exposure available'
    };
}

export function validateItem(item) {
    const errors = [];
    const requireField = (path, field) => {
        if (!field || typeof field.value !== 'string' || field.value.trim().length === 0) {
            errors.push(`${path}.value missing`);
        }
        if (!field || typeof field.source !== 'string' || field.source.trim().length === 0) {
            errors.push(`${path}.source missing`);
        }
    };

    requireField('name', item.name);
    requireField('image', item.image);
    requireField('hazard.summary', item.hazard?.summary);
    requireField('hazard.evidence_grade', item.hazard?.evidence_grade);
    requireField('hazard.uncertainty_interval', item.hazard?.uncertainty_interval);
    requireField('exposure.summary', item.exposure?.summary);
    requireField('exposure.availability', item.exposure?.availability);
    requireField('risk.summary', item.risk?.summary);
    requireField('risk.level', item.risk?.level);
    requireField('risk.evidence_grade', item.risk?.evidence_grade);
    requireField('risk.uncertainty_interval', item.risk?.uncertainty_interval);
    requireField('recommendation', item.recommendation);

    if (item?.hazard?.uncertainty_interval?.value) {
        if (!intervalIsValid(item.hazard.uncertainty_interval.value)) {
            errors.push('hazard.uncertainty_interval invalid');
        }
    }
    if (item?.risk?.uncertainty_interval?.value) {
        if (!intervalIsValid(item.risk.uncertainty_interval.value)) {
            errors.push('risk.uncertainty_interval invalid');
        }
    }

    return errors;
}
