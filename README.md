
# Machine Learning-Based Phishing Website Detection

## Project Overview
This cybersecurity project investigates whether machine
learning can identify phishing websites using numerical
URL characteristics.

Two machine learning models were compared:
- Decision Tree
- Random Forest

## Dataset
**Name:** Web Page Phishing Dataset

**Source:** https://www.kaggle.com/datasets/danielfernandon/web-page-phishing-dataset

The original dataset contains 100,077 records,
19 URL features, and one phishing classification label.

- 0 = Legitimate website
- 1 = Phishing website

After removing exact duplicate records, 21,891 records
remained for analysis.

## Tools and Technologies
- Python
- Google Colab
- Pandas
- Scikit-learn
- Matplotlib
- SQLite is not used in this project.

## Methodology
1. Load and explore the Kaggle dataset.
2. Analyze missing values and duplicate records.
3. Visualize URL characteristics and correlations.
4. Remove exact duplicate records.
5. Split the dataset into training and testing sets.
6. Train Decision Tree and Random Forest classifiers.
7. Evaluate the models using classification metrics.
8. Analyze feature importance and security implications.

## Experimental Results

| Model | Accuracy |
|---|---|
| Decision Tree | 81.41% |
| Random Forest | 82.58% |

The Random Forest model achieved approximately
94% recall for phishing websites.

However, it also incorrectly classified some
legitimate websites as phishing.

## How to Run the Project

1. Download the notebook from this repository.
2. Open it in Google Colab.
3. Download the dataset from the Kaggle link above.
4. Upload `web-page-phishing.csv` to Colab.
5. Run the notebook cells in order.

## Security Implications
False positives may block legitimate websites.
False negatives may allow users to access phishing websites.

This project demonstrates that URL-based machine learning
can support phishing detection, but should not be the
only security protection.

## Project Files
- Jupyter Notebook: Python analysis and models
- Project Proposal PDF: Research proposal
- Final Report PDF: Complete analysis and findings

## Credits
Dataset: Web Page Phishing Dataset, Kaggle.

Libraries: Pandas, Scikit-learn, and Matplotlib.

The analysis was developed for an educational cybersecurity
project. AI assistance was used for code guidance,
debugging, and report organization.
