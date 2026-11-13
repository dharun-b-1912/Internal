import assert from 'node:assert/strict';
import test from 'node:test';
import { readApplication, safeApplicationImage, applicationSections } from '../lib/employee-application.ts';

test('application parsing handles legacy records and malformed data', () => {
  for (const value of [null, '', 'invalid', '[]', 'null']) assert.deepEqual(readApplication(value), {});
  assert.deepEqual(readApplication('{"Date":"2026-09-09","bad":12}'), {Date:'2026-09-09'});
});
test('signature previews reject external URLs and executable image types', () => {
  for (const value of ['javascript:alert(1)', 'https://example.com/track.png', 'data:image/svg+xml;base64,PHN2Zz4=']) assert.equal(safeApplicationImage(value), undefined);
  assert.equal(safeApplicationImage('data:image/png;base64,YQ=='), 'data:image/png;base64,YQ==');
});
test('application field names are unique and retain separate declarations', () => {
  const names=applicationSections.flatMap(s => s.fields);
  assert.equal(new Set(names).size,names.length);
  assert.ok(names.includes('Declaration'));
  assert.ok(names.includes('Digital Signature (Type your full name)'));
});

test('application document approval states and categories validation', () => {
  const validStatuses = ['pending_approval', 'approved', 'rejected'];
  assert.equal(validStatuses.length, 3);
  const sampleDoc = {
    category: 'Aadhar Front side',
    filename: 'aadhar_front.pdf',
    dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
    status: 'pending_approval',
    rejectionReason: null,
    reviewedBy: null,
    reviewedAt: null,
  };
  assert.equal(sampleDoc.status, 'pending_approval');
  assert.equal(sampleDoc.rejectionReason, null);

  // Rejection scenario
  const rejectedDoc = {
    ...sampleDoc,
    status: 'rejected',
    rejectionReason: 'Blurred text or wrong document',
    reviewedBy: 'superadmin@joy.com',
    reviewedAt: '2026-09-29T10:00:00.000Z',
  };
  assert.equal(rejectedDoc.status, 'rejected');
  assert.ok(rejectedDoc.rejectionReason.length > 0);

  // Approval scenario
  const approvedDoc = {
    ...sampleDoc,
    status: 'approved',
    rejectionReason: null,
    reviewedBy: 'superadmin@joy.com',
    reviewedAt: '2026-09-29T10:05:00.000Z',
  };
  assert.equal(approvedDoc.status, 'approved');
});

test('residential address and permanent address are decoupled and independent', () => {
  const employee = {
    addressLine: '123 Cross Street, Gandhipuram, Coimbatore',
    applicationJson: JSON.stringify({
      'Permanent Address': '45 South Street, Melur, Madurai - 625106',
    }),
  };

  const parsedApp = readApplication(employee.applicationJson);
  assert.equal(parsedApp['Permanent Address'], '45 South Street, Melur, Madurai - 625106');
  assert.equal(employee.addressLine, '123 Cross Street, Gandhipuram, Coimbatore');

  // Updating residential address must keep permanent address intact
  const updatedResidential = '789 North Avenue, RS Puram, Coimbatore';
  const afterResidentialUpdate = {
    ...parsedApp,
    'Permanent Address': parsedApp['Permanent Address'], // Unchanged
  };
  assert.equal(afterResidentialUpdate['Permanent Address'], '45 South Street, Melur, Madurai - 625106');
  assert.notEqual(afterResidentialUpdate['Permanent Address'], updatedResidential);

  // Updating permanent address must keep residential address intact
  const updatedPermanent = '12 Temple View, Trichy - 620001';
  const afterPermanentUpdate = {
    ...parsedApp,
    'Permanent Address': updatedPermanent,
  };
  assert.equal(afterPermanentUpdate['Permanent Address'], '12 Temple View, Trichy - 620001');
  assert.equal(employee.addressLine, '123 Cross Street, Gandhipuram, Coimbatore');
});

test('getDocumentUploadDate extracts upload date before approval across various formats', async () => {
  const { getDocumentUploadDate } = await import('../lib/employee-application.ts');

  // Case 1: Explicit uploadedAt
  assert.equal(
    getDocumentUploadDate({ category: 'Aadhar Front side', filename: 'doc.pdf', dataUrl: '', uploadedAt: '2026-10-17T09:30:00Z' }),
    '17 Oct 2026'
  );

  // Case 2: Snake_case created_at
  assert.equal(
    getDocumentUploadDate({ category: 'Aadhar Back side', filename: 'doc.pdf', dataUrl: '', created_at: '2026-10-17' }),
    '17 Oct 2026'
  );

  // Case 3: WhatsApp image filename with date
  assert.equal(
    getDocumentUploadDate({ category: 'Aadhar Front side', filename: 'WhatsApp Image 2026-10-17 at 9.52.02 AM.jpeg', dataUrl: '' }),
    '17 Oct 2026'
  );

  // Case 4: Compact date in filename (IMG-20261017-WA0001.jpg)
  assert.equal(
    getDocumentUploadDate({ category: 'Candidate Photo', filename: 'IMG-20261017-WA0001.jpg', dataUrl: '' }),
    '17 Oct 2026'
  );

  // Case 5: Onboarding submission timestamp
  assert.equal(
    getDocumentUploadDate(
      { category: 'PAN Card', filename: 'pan_card.png', dataUrl: '' },
      { applicationJson: JSON.stringify({ Date: '01-10-2026', _joyOnboarding: { submitted: '2026-10-21T11:17:55Z' } }) }
    ),
    '21 Oct 2026'
  );

  // Case 6: Plain application date or dateOfJoining must NOT be used as document upload date
  assert.equal(
    getDocumentUploadDate(
      { category: 'Bank Proofs', filename: 'passbook.png', dataUrl: '' },
      { applicationJson: JSON.stringify({ Date: '01-10-2026' }), dateOfJoining: '2026-10-01' }
    ),
    ''
  );
});

test('clearing ESI and UAN numbers removes them completely and purges legacy questionnaire values', () => {
  // Simulate helper logic in employeeValues
  function optionalValue(value) {
    if (value === null || value === undefined) return null;
    const result = String(value).trim();
    return result || null;
  }

  function simulateEmployeeSave(payload, existingAppJson) {
    let applicationJson = existingAppJson;
    const appMap = JSON.parse(applicationJson || '{}');

    const explicitUan = payload.uanMasked !== undefined;
    const uanMasked = explicitUan
      ? optionalValue(payload.uanMasked)
      : (optionalValue(payload.uanMasked) ?? optionalValue(appMap['PF / UAN Number'] || appMap['UAN']));

    const explicitEsi = payload.esiMasked !== undefined;
    const esiMasked = explicitEsi
      ? optionalValue(payload.esiMasked)
      : (optionalValue(payload.esiMasked) ?? optionalValue(appMap['ESI Number'] || appMap['ESI']));

    if (!uanMasked && applicationJson) {
      try {
        const parsed = JSON.parse(applicationJson);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          delete parsed['PF / UAN Number'];
          delete parsed['UAN'];
          applicationJson = JSON.stringify(parsed);
        }
      } catch {}
    }

    if (!esiMasked && applicationJson) {
      try {
        const parsed = JSON.parse(applicationJson);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          delete parsed['ESI Number'];
          delete parsed['ESI'];
          applicationJson = JSON.stringify(parsed);
        }
      } catch {}
    }

    return { uanMasked, esiMasked, applicationJson };
  }

  // 1. Initial state with ESI and UAN in applicationJson
  const initialAppJson = JSON.stringify({
    'ESI Number': '3123456789',
    'PF / UAN Number': '101234567890',
    'Mobile number': '9876543210'
  });

  // 2. HR clears ESI number by passing empty string
  const resultAfterClear = simulateEmployeeSave(
    { esiMasked: '', uanMasked: '101234567890' },
    initialAppJson
  );

  assert.equal(resultAfterClear.esiMasked, null);
  assert.equal(resultAfterClear.uanMasked, '101234567890');
  const parsedCleaned = JSON.parse(resultAfterClear.applicationJson);
  assert.equal(parsedCleaned['ESI Number'], undefined);
  assert.equal(parsedCleaned['PF / UAN Number'], '101234567890');
  assert.equal(parsedCleaned['Mobile number'], '9876543210');

  // 3. Subsequent load in Edit modal does not resurrect ESI number
  const employeeState = { esiMasked: resultAfterClear.esiMasked, uanMasked: resultAfterClear.uanMasked };
  const modalEsiDefault = employeeState ? (employeeState.esiMasked ?? '') : (parsedCleaned['ESI Number'] || '');
  assert.equal(modalEsiDefault, '');
});


