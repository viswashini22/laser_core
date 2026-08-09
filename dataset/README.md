# NASA IMS Bearing Dataset Storage

Place your downloaded NASA IMS Bearing Dataset files in this directory.

## Download Instructions
1. Visit the official NASA PCoE Dataset Repository:
   [https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/](https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/)
2. Download the **IMS Bearing Data Set** (Test 1, Test 2, or Test 3).
3. Unpack the files into this `dataset/` directory.

The feature extraction script (`ml/extract_features.py`) will automatically scan this folder for raw vibration files, process signal windows, extract time/frequency domain features, and save the dataset to `data/features.csv`.
