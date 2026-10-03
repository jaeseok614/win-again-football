package com.jaeseok614.winagainfootball;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

/** Synthetic single JSON document, included exclusively in the instrumentation APK. */
public final class CampaignTestProvider extends ContentProvider {
    public static final Uri URI = Uri.parse("content://com.jaeseok614.winagainfootball.testdocuments/campaign.json");
    @Override public boolean onCreate() { return true; }
    private File document() { return new File(getContext().getCacheDir(), "native-roundtrip.json"); }
    @Override public String getType(Uri uri) { return "application/json"; }
    @Override public Cursor query(Uri uri, String[] projection, String selection, String[] args, String sort) {
        String[] columns = projection != null ? projection : new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE};
        MatrixCursor cursor = new MatrixCursor(columns);
        Object[] row = new Object[columns.length];
        for (int i = 0; i < columns.length; i++) row[i] = columns[i].equals(OpenableColumns.SIZE) ? document().length() : "campaign.json";
        cursor.addRow(row); return cursor;
    }
    @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (!URI.equals(uri)) throw new FileNotFoundException("Unknown synthetic document");
        return ParcelFileDescriptor.open(document(), ParcelFileDescriptor.parseMode(mode));
    }
    @Override public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException(); }
    @Override public int delete(Uri uri, String selection, String[] args) { return document().delete() ? 1 : 0; }
    @Override public int update(Uri uri, ContentValues values, String selection, String[] args) { throw new UnsupportedOperationException(); }
}
